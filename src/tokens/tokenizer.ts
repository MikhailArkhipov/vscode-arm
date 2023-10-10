// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.
// Partially based on
//  https://github.com/microsoft/pyright/blob/main/packages/pyright-internal/src/parser/tokenizer.ts
//  https://github.com/MikhailArkhipov/vscode-r/tree/master/src/Languages/Core/Impl/Tokens

import { Char, Character } from '../text/charCodes';
import { CharacterStream } from '../text/characterStream';
import { NumberTokenizer } from './numberTokenizer';
import { isRegisterName } from './registers';
import { Directive } from './directive';
import { TextProvider } from '../text/definitions';
import { Token, TokenSubType, TokenType } from './definitions';
import { TokenImpl } from './tokens';

// NOTE: use of .valueof() with enums is b/c of https://github.com/microsoft/TypeScript/issues/9998.
// I am not inclined to change currentToken property to a function to work around the TS issue.

enum TokenizerState {
  Normal = 0,
  PastLabel = 1,
  PastDirective = 2, // Also instruction
}

export class Tokenizer {
  private readonly _instructionSet: string;
  private _numberTokenizer: NumberTokenizer;
  private _cs: CharacterStream;
  private _tokens: Token[] = [];
  private _state = TokenizerState.Normal;
  private _macroMode = false;

  constructor(instructionSet: string) {
    this._instructionSet = instructionSet;
  }

  public tokenize(textProvider: TextProvider): readonly Token[] {
    this._cs = new CharacterStream(textProvider);

    this._tokens = [];
    this._state = TokenizerState.Normal;
    this._numberTokenizer = new NumberTokenizer(this._cs);

    while (!this._cs.isEndOfStream()) {
      const start = this._cs.position;
      this.addNextToken();
      // If token was added, the position must change.
      if (this._cs.position === start && !this._cs.isEndOfStream()) {
        // We must advance or tokenizer hangs
        throw new Error('Tokenizer: infinite loop');
      }
    }
    return this._tokens;
  }

  // [label:] [instruction] [sequence[, sequence[, ...]]] [//|@] comment <eol>
  private addNextToken(): void {
    this.skipWhitespace();

    // Labels only appear first in line.
    // TODO: At the moment we don't care about cases like
    // /* */ /* */ ... label: instruction.
    if (this._state === TokenizerState.Normal && this.tryLabel()) {
      this._state = TokenizerState.PastLabel;
      return;
    }

    if (this._state < TokenizerState.PastDirective && this.tryDirective()) {
      this._state = TokenizerState.PastDirective;
      return;
    }

    // Handle possible comments
    if (this.handleCBlockComment()) {
      return;
    }
    if (this.isAtLineComment()) {
      this.handleLineComment();
      return;
    }

    // Try immediate with # right away so we don't have to
    if (this.tryImmediate()) {
      return;
    }
    // Handle simple cases that do NOT conflict with numbers.
    if (this.tryBasicChars1()) {
      return;
    }
    // Try and detect numbers - without leading #.
    if (this.tryNumber(this._cs.position)) {
      return;
    }
    // Remaining simple cases.
    if (this.tryBasicChars2()) {
      return;
    }
    // Macro label reference?
    if (this.tryMacroLabelReference()) {
      this._state = TokenizerState.PastDirective;
      return;
    }
    if (this.tryMacroSymbol()) {
      this._state = TokenizerState.PastDirective;
      return;
    }
    if (this.handleSymbol()) {
      this._state = TokenizerState.PastDirective;
      return;
    }

    this.handleUnknown();
  }

  private tryNumber(start: number): boolean {
    // We must prevent recognition of 1+2 as 'number number'.
    // This only happens when number has a sign and does not have #.
    if (this._cs.prevChar !== Char.Hash && this._cs.prevChar !== Char.$ && this._tokens.length > 0) {
      if (this._cs.currentChar === Char.Plus || this._cs.currentChar === Char.Minus) {
        const previousToken = this._tokens[this._tokens.length - 1];
        // +/- are operators if previous token was ), symbol or number.
        // This presents a problem if prev token was an instruction such as 'CMD -1'.
        // This is an odd thing for ARM, but technically possible. We will ignore this
        // case for now since the worst that would happen is that the number won't be
        // colorized properly.
        if (
          previousToken.type === TokenType.Symbol ||
          previousToken.type === TokenType.Number ||
          previousToken.type === TokenType.CloseBrace ||
          previousToken.type === TokenType.CloseCurly
        ) {
          // )+, 1+2, x+1
          this.addTokenAndMove(TokenType.Operator, start);
          // Let next pass handle the rest
          return true;
        }
      }
    }

    const length = this._numberTokenizer.tryNumber();
    if (length > 0) {
      // Number tokenizer changes token stream position so no need to advance.
      this.addToken(TokenType.Number, start, this._cs.position - start);
      return true;
    }
    return false;
  }

  // No plus or minus here or you may lose a number!!!
  private tryBasicChars1(): boolean {
    switch (this._cs.currentChar) {
      case Char.Period:
        // Special GAS symbol 'current'. Must be standalone.
        if (isPeriodSymbol(this._cs)) {
          this.addTokenAndMove(TokenType.Symbol, this._cs.position);
          return true;
        }
        break;
      case Char.Less: // <<
        if (this._cs.nextChar === Char.Less) {
          this.addToken(TokenType.Operator, this._cs.position, 2);
          this._cs.advance(2);
          return true;
        }
        break;

      case Char.Greater: // >>
        if (this._cs.nextChar === Char.Greater) {
          this.addToken(TokenType.Operator, this._cs.position, 2);
          this._cs.advance(2);
          return true;
        }
        break;

      case Char.Ampersand:
      case Char.Asterisk:
      case Char.Bar:
      case Char.Equal:
      case Char.ExclamationMark:
      case Char.Percent:
      case Char.Slash:
        this.addTokenAndMove(TokenType.Operator, this._cs.position);
        return true;

      case Char.OpenBracket:
        this.addTokenAndMove(TokenType.OpenBracket, this._cs.position);
        return true;
      case Char.CloseBracket:
        this.addTokenAndMove(TokenType.CloseBracket, this._cs.position);
        return true;
      case Char.OpenCurly:
        this.addTokenAndMove(TokenType.OpenCurly, this._cs.position);
        return true;
      case Char.CloseCurly:
        this.addTokenAndMove(TokenType.CloseCurly, this._cs.position);
        return true;
      case Char.OpenBrace:
        this.addTokenAndMove(TokenType.OpenBrace, this._cs.position);
        return true;
      case Char.CloseBrace:
        this.addTokenAndMove(TokenType.CloseBrace, this._cs.position);
        return true;
      case Char.Comma:
        this.addTokenAndMove(TokenType.Comma, this._cs.position);
        return true;

      case Char.LineFeed:
      case Char.CarriageReturn:
        this.handleLineBreak();
        this._state = TokenizerState.Normal;
        return true;

      case Char.SingleQuote:
      case Char.DoubleQuote:
        this.handleString(this._cs.position);
        return true;
    }
    return false;
  }

  private tryBasicChars2(): boolean {
    switch (this._cs.currentChar) {
      case Char.Plus:
      case Char.Minus:
        this.addTokenAndMove(TokenType.Operator, this._cs.position);
        return true;
    }
    return false;
  }

  // Attempt to determine if sequence is a label.
  private tryLabel(): boolean {
    if (!this.isPositionFirstInLine()) {
      return false;
    }
    // https://sourceware.org/binutils/docs/as/Symbol-Names.html
    // Symbol starts with _, $ or a letter, then can contain underscores,/ dollar signs, letters or digits.
    // Exception is local labels which are numbers possible ending with dollar signs and optionally, 'b' or 'f'.
    // HOWEVER... there are also '.label:' and it appears many other things are accepted by assemblers.
    // Plus, in macro mode, numerical labels are normal as well as .L**: or l&:.
    const start = this._cs.position;
    this._cs.skipNonWsSequence((ch: number): boolean => {
      return ch !== Char.Colon;
    });
    if (this._cs.currentChar === Char.Colon) {
      this._cs.moveToNextChar();
      this.addToken(TokenType.Label, start, this._cs.position - start);
      return true;
    }
    this._cs.position = start;
    return false;
  }

  private tryDirective(): boolean {
    if (this._cs.currentChar !== Char.Period.valueOf()) {
      return false;
    }

    switch (this._cs.nextChar) {
      case Char._2:
      case Char._4:
      case Char._8:
        break;
      default:
        if (!Character.isAnsiLetter(this._cs.nextChar)) {
          return false;
        }
    }

    const start = this._cs.position;
    this._cs.moveToNextChar();
    this._cs.skipNonWsSequence(
      (ch: number): boolean => Character.isAnsiLetter(ch) || Character.isDecimal(ch) || ch === Char.Underscore
    );

    const length = this._cs.position - start;
    // We must be at whitespace or else this is not a directive.
    if (length === 0 || (!this._cs.isWhiteSpace() && !this._cs.isEndOfStream())) {
      this._cs.position = start;
      return false;
    }

    const token = this.addToken(TokenType.Directive, start, length);
    const text = this._cs.text.getText(start, length);

    if (Directive.isDefinition(text)) {
      token.subType = TokenSubType.Definition;
      return true;
    }
    if (Directive.isDeclaration(text)) {
      token.subType = TokenSubType.Declaration;
      return true;
    }

    switch (text) {
      case '.macro':
        token.subType = TokenSubType.BeginMacro;
        this._macroMode = true;
        break;
      case '.endm':
        token.subType = TokenSubType.EndMacro;
        this._macroMode = false;
        break;
      case '.endif':
        token.subType = TokenSubType.EndCondition;
        break;
      case '.include':
        token.subType = TokenSubType.Include;
        break;
      default:
        token.subType = text.startsWith('.if') ? TokenSubType.BeginCondition : TokenSubType.None;
        break;
    }
    return true;
  }

  private tryMacroLabelReference(): boolean {
    //A decimal number followed by f or b.
    if (!this._macroMode) {
      return false;
    }
    if (!Character.isDecimal(this._cs.currentChar)) {
      return false;
    }
    const start = this._cs.position;
    this._cs.skipNonWsSequence((ch) => Character.isDecimal(ch));
    if (this._cs.currentChar === Char.f || this._cs.currentChar === Char.b) {
      this._cs.moveToNextChar();
    }
    if (isHardStopCharacter(this._cs.currentChar) || this._cs.isWhiteSpace()) {
      this.addToken(TokenType.Symbol, start, this._cs.position - start, TokenSubType.MacroLabelReference);
      return true;
    }
    this._cs.position = start;
    return false;
  }

  private tryMacroSymbol(): boolean {
    if (!this._macroMode) {
      return false;
    }
    if (this._cs.currentChar !== Char.Backslash) {
      return false;
    }
    const start = this._cs.position;
    this._cs.moveToNextChar();
    this.skipSymbol();

    if (
      this._cs.currentChar === Char.Backslash &&
      this._cs.nextChar === Char.OpenBrace &&
      this._cs.lookAhead(2) === Char.CloseBrace
    ) {
      // The string ‘\()’ can be used to separate the end of a macro argument from the following text
      // \base\().length
      this._cs.advance(3);
      this.addToken(TokenType.Symbol, start, this._cs.position - start, TokenSubType.MacroParameter);
      return true;
    }
    this._cs.position = start;
    return false;
  }

  private handleSymbol(): boolean {
    //https://sourceware.org/binutils/docs-2.26/as/Symbol-Intro.html#Symbol-Intro
    const start = this._cs.position;
    this.skipSymbol();

    if (this._cs.position === start) {
      return false; // Not a symbol
    }

    const text = this._cs.text.getText(start, this._cs.position - start);
    if (this._macroMode) {
      if (text.indexOf('\\') >= 0) {
        // \foo is a reference to the macro parameters. In macro mode we merge macro
        // parameter reference into adjoining symbol, if any. This is to simplify parsing
        // For example, R\x is, effectively, part of the symbol. If we don't merge,
        // expression parser will have hard time handling 1+2\x since 'operand + operand operand'
        // is not a legal expression and the parser will yield 'operator expected' error.
        // Colorizer may choose to look into \ in the item and split colorable range
        // into two distinct items, but that is just visual effect.
        const pt = this._tokens.length > 0 ? this._tokens[this._tokens.length - 1] : undefined;
        if (pt && pt.end === start && pt.type !== TokenType.Unknown && pt.type !== TokenType.EndOfLine) {
          this._tokens.pop();
          const t = this.addToken(TokenType.Symbol, pt.start, this._cs.position - pt.start);
          t.subType = TokenSubType.MacroParameter;
        } else {
          const t = this.addToken(TokenType.Symbol, start, this._cs.position - start);
          t.subType = TokenSubType.MacroParameter;
        }
        return true;
      }

      if (text.endsWith('f') || text.endsWith('b')) {
        // Possibly label reference
      }
    }

    const token = new TokenImpl(TokenType.Symbol, start, this._cs.position - start);
    if (this._state === TokenizerState.PastDirective && isRegisterName(text, this._instructionSet)) {
      token.subType = TokenSubType.Register;
    }
    this._tokens.push(token);
    return true;
  }

  private handleUnknown(): void {
    // Unclear what it is. Skip unknown stuff, but do stop at important
    // characters, like potential comments, comma, operators.
    this.skipWhitespace();
    const start = this._cs.position;
    this._cs.skipNonWsSequence((ch: number): boolean => {
      return !isHardStopCharacter(ch);
    });

    if (this._cs.position > start) {
      this.addToken(TokenType.Unknown, start, this._cs.position - start);
      return;
    }
    // We were unable to move forward
    if (this._cs.isAtNewLine() || this._cs.isEndOfStream()) {
      return;
    }
    // Not EOL or EOF but we could not move. However, we must recover
    // or tokenizer will be in an infinite loop.
    if (this._cs.position === start) {
      // Must move forward
      this._cs.moveToNextChar();
    }
    this.addToken(TokenType.Unknown, start, this._cs.position - start);
  }

  // Handle generic comment that spans to the end of the line.
  // Comment explicitly terminate current statement, no next
  // line continuation is allowed.
  private isAtLineComment(): boolean {
    switch (this._cs.currentChar) {
      case Char.Hash:
        // GNU # comment: #<space>.
        // TODO: support GNU preprocessing instructions, like #define?
        // For semantic coloring or special completions after #.
        return Character.isWhitespace(this._cs.nextChar);

      case Char.Slash:
        return this._cs.nextChar === Char.Slash;
      case Char.At:
        return true;
    }
    return false;
  }

  private handleLineComment(): void {
    const start = this._cs.position;
    this._cs.moveToEol();

    const length = this._cs.position - start;
    if (length > 0) {
      this.addToken(TokenType.LineComment, start, length);
    }
  }

  private handleCBlockComment(): boolean {
    if (this._cs.currentChar !== Char.Slash || this._cs.nextChar !== Char.Asterisk) {
      return false;
    }

    const start = this._cs.position;
    this._cs.advance(2); // Skip /*
    while (!this._cs.isEndOfStream()) {
      if (this._cs.currentChar === Char.Asterisk.valueOf() && this._cs.nextChar === Char.Slash.valueOf()) {
        this._cs.advance(2);
        break;
      }
      this._cs.moveToNextChar();
    }
    this.addToken(TokenType.BlockComment, start, this._cs.position - start);
    return true;
  }

  private handleLineBreak(): void {
    if (this._cs.isAtNewLine()) {
      const start = this._cs.position;
      this._cs.skipLineBreak();
      this.addToken(TokenType.EndOfLine, start, this._cs.position - start);
    }
  }

  private handleString(start: number): void {
    const openQuote = this._cs.currentChar;
    this._cs.moveToNextChar();

    while (!this._cs.isEndOfStream() && !this._cs.isAtNewLine() && this._cs.currentChar !== openQuote) {
      this._cs.moveToNextChar();
    }
    if (this._cs.currentChar === openQuote) {
      this._cs.moveToNextChar();
    }
    // String may be unterminated
    this.addToken(TokenType.String, start, this._cs.position - start);
  }

  private tryImmediate(): boolean {
    // Immediate can be anything - a number (most common case) such as #0x1,
    // but also a string or a single character, or. with GCC, an operator
    // over label or variable like #:lower16:label. We file immediate
    // as an underlying type since for the user both 1 and #1 are the same
    // thing and should be colorized identically. This also simplifies parser.

    // Immediate? GNU also permits '$'
    if (this._cs.currentChar !== Char.Hash && this._cs.currentChar !== Char.$) {
      return false;
    }
    // Skip hash/dollar, but remember actual start position
    const start = this._cs.position;
    this._cs.moveToNextChar();

    // #"abc"
    if (this._cs.isAtString()) {
      this.handleString(start);
      return true;
    }

    // Possibly #:lower16:label
    if (this._cs.currentChar === Char.Colon.valueOf()) {
      this._cs.moveToNextChar;
      this.skipSymbol();
      if (this._cs.currentChar === Char.Colon.valueOf()) {
        this._cs.moveToNextChar();
        this.skipSymbol();
        this.addToken(TokenType.Symbol, start, this._cs.position - start);
        return true;
      }
    }

    //#symbol, #\symbol
    if (this.skipSymbol()) {
      this.addToken(TokenType.Symbol, start, this._cs.position - start);
      return true;
    }
    // #8, #0xABCD
    if (this.tryNumber(start)) {
      return true;
    }

    // Perhaps an expression follows, like #(a+1)?
    // Remember, we are past # at this point, so don't advance.
    this.addToken(TokenType.Unknown, start, 1);
    return true;
  }

  private addToken(type: TokenType, start: number, length: number, tokenSubType?: TokenSubType): Token {
    const token = new TokenImpl(type, start, length);
    if (tokenSubType) {
      token.subType = tokenSubType;
    }
    this._tokens.push(token);
    return token;
  }

  private addTokenAndMove(type: TokenType, start: number, tokenSubType?: TokenSubType): Token {
    const t = this.addToken(type, start, 1, tokenSubType);
    this._cs.moveToNextChar();
    return t;
  }

  // Skip over whitespace characters within a line.
  private skipWhitespace(): void {
    while (this._cs.isWhiteSpace()) {
      if (this._cs.isAtNewLine()) {
        break;
      }
      this._cs.moveToNextChar();
    }
  }

  private skipSymbol(): boolean {
    // Allow period since there may be specifier on instructions
    // like .I8 and it should be part of the instruction name.
    // We may end up recognizing '.a.b.c' as directives, but we
    // will let validator deal with it.

    const start = this._cs.position;
    if (!this.isLeadingSymbolCharacter(this._cs.currentChar)) {
      this._cs.position = start;
      return false;
    }
    this._cs.moveToNextChar();
    this._cs.skipNonWsSequence((ch: number): boolean => {
      return isSymbolCharacter(ch);
    });
    return this._cs.position > start;
  }

  // Checks if position is first in line OR is preceded by block comments only.
  // Example: \nFoo, \n/* */ Foo, \n/* */ /* */ Foo, etc.
  private isPositionFirstInLine(): boolean {
    for (let i = this._tokens.length - 1; i >= 0; i--) {
      const t = this._tokens[i];
      switch (t.type) {
        case TokenType.EndOfLine:
          return true;
        case TokenType.BlockComment:
          continue;
        default:
          return false;
      }
    }
    return true;
  }

  private isLeadingSymbolCharacter(ch: number): boolean {
    return Character.isAnsiLetter(ch) || ch === Char.Underscore || (this._macroMode && ch === Char.Backslash);
  }
}

function isSymbolCharacter(ch: number): boolean {
  return (
    Character.isAnsiLetter(ch) ||
    Character.isDecimal(ch) ||
    ch === Char.Underscore ||
    ch === Char.$ ||
    ch === Char.Period
  );
}

// When skipping unrecognized sequences we need to stop at potential
// operators, comments, braces, so tokenizer can recover.
function isHardStopCharacter(ch: number): boolean {
  switch (ch) {
    case Char.At:
    case Char.Less: // <<
    case Char.Greater: // >>
    case Char.Equal:
    case Char.Slash:
    case Char.Asterisk:
    case Char.Percent:
    case Char.ExclamationMark:
    case Char.Ampersand:
    case Char.Bar:
    case Char.Caret:
    case Char.OpenBracket:
    case Char.CloseBracket:
    case Char.OpenBrace:
    case Char.CloseBrace:
    case Char.OpenCurly:
    case Char.CloseCurly:
    case Char.Comma:
    case Char.SingleQuote:
    case Char.DoubleQuote:
    case Char.Backslash:
    case Char.Colon:
      return true;
  }
  return false;
}

function isPeriodSymbol(cs: CharacterStream): boolean {
  if (Character.isAnsiLetter(cs.nextChar) || Character.isDecimal(cs.nextChar)) {
    return false;
  }
  // Find previous and next chars while skipping whitespace.
  let prevChar = 0;
  let offset = -1;
  do {
    prevChar = cs.lookAhead(offset);
    if (!Character.isWhitespace(prevChar)) {
      break;
    }
    offset--;
  } while (!Character.isNewLine(prevChar) && prevChar !== Char.Null);

  let nextChar = 0;
  offset = 1;
  do {
    nextChar = cs.lookAhead(offset);
    if (!Character.isWhitespace(nextChar)) {
      break;
    }
    offset++;
  } while (!Character.isNewLine(nextChar) && nextChar !== Char.Null);

  switch (prevChar) {
    case Char.CloseBrace:
    case Char.CloseBracket:
    case Char.CloseCurly:
      return false;
    case Char.Equal:
    case Char.Plus:
    case Char.Minus:
      return true;
  }

  switch (nextChar) {
    case Char.Equal:
    case Char.Plus:
    case Char.Minus:
    case Char.Asterisk:
    case Char.Percent:
    case Char.Slash:
      return true;
  }
  return false;
}
