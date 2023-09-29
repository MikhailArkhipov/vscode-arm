// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.
// Partially based on
//  https://github.com/microsoft/pyright/blob/main/packages/pyright-internal/src/parser/tokenizer.ts
//  https://github.com/MikhailArkhipov/vscode-r/tree/master/src/Languages/Core/Impl/Tokens

import { text } from 'node:stream/consumers';
import { LanguageOptions } from '../core/languageOptions';
import { Char, Character } from '../text/charCodes';
import { CharacterStream } from '../text/characterStream';
import { TextProvider } from '../text/text';
import { NumberTokenizer } from './numberTokenizer';
import { isRegisterName } from './registers';
import { Token, TokenSubType, TokenType } from './tokens';
import { Directive } from './directive';

// NOTE: use of .valueof() with enums is b/c of https://github.com/microsoft/TypeScript/issues/9998.
// I am not inclined to change currentToken property to a function to work around the TS issue.

export class Tokenizer {
  private readonly _options: LanguageOptions;
  private _numberTokenizer: NumberTokenizer;
  private _cs: CharacterStream;
  private _tokens: Token[] = [];
  private _pastLabel = false;

  constructor(options: LanguageOptions) {
    this._options = options;
  }

  public tokenize(textProvider: TextProvider, start: number, length: number): readonly Token[] {
    this._cs = new CharacterStream(textProvider);
    this._cs.position = start;

    this._tokens = [];
    this._pastLabel = false;
    this._numberTokenizer = new NumberTokenizer(this._cs);

    const end = Math.min(textProvider.length, start + length);
    while (!this._cs.isEndOfStream() && this._cs.position < end) {
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

    // Handle possible comments
    this.handleCBlockComment();
    if (this.isAtLineComment()) {
      this.handleLineComment();
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
    // Remanining simple cases that do conflict with numbers.
    if (this.tryBasicChars2()) {
      return;
    }
    this.handleOtherChars();
  }

  private isPossibleNumber(): boolean {
    if (this._cs.currentChar === Char.Minus || this._cs.currentChar === Char.Plus) {
      // Next character must be decimal or a dot otherwise
      // it is not a number. No whitespace is allowed.
      if (Character.isDecimal(this._cs.nextChar) || this._cs.nextChar === Char.Period) {
        if (this._tokens.length > 0) {
          // prevent recognition of 1+2 as 'number number'
          const previousToken = this._tokens[this._tokens.length - 1];
          if (
            previousToken.type !== TokenType.OpenBrace &&
            previousToken.type !== TokenType.OpenBracket &&
            previousToken.type !== TokenType.Comma &&
            previousToken.type !== TokenType.Operator
          ) {
            return false;
          }
        }
      }
    }
    return true;
  }

  private tryNumber(start: number): boolean {
    if (this._tokens.length > 0) {
      // prevent recognition of 1+2 as 'number number'
      const previousToken = this._tokens[this._tokens.length - 1];
      if (
        previousToken.type !== TokenType.OpenBrace &&
        previousToken.type !== TokenType.OpenBracket &&
        previousToken.type !== TokenType.Comma &&
        previousToken.type !== TokenType.Operator &&
        previousToken.type !== TokenType.Directive
      ) {
        return false;
      }
    }

    const length = this._numberTokenizer.tryNumber();
    if (length > 0) {
      this.addToken(TokenType.Number, start, this._cs.position - start);
      return true;
    }
    return false;
  }

  // No plus or minus here or you may lose a number!!!
  private tryBasicChars1(): boolean {
    switch (this._cs.currentChar) {
      case Char.Less: // <<
        if (this._cs.nextChar === Char.Less) {
          this.addToken(TokenType.Operator, this._cs.position, 2);
          this._cs.advance(2);
        }
        break;

      case Char.Greater: // >>
        if (this._cs.nextChar === Char.Greater) {
          this.addToken(TokenType.Operator, this._cs.position, 2);
          this._cs.advance(2);
        }
        break;

      case Char.Slash:
      case Char.Asterisk:
      case Char.Percent:

      case Char.Ampersand:
      case Char.Bar:
        this.addTokenAndMove(TokenType.Operator, this._cs.position);
        return true;

      case Char.Equal:
      case Char.ExclamationMark:
      case Char.Caret:
        // We treat = that appears before expressions as well as ! and ^ that may appear
        // after expressions as special, no-op operators. Parser will collect them but
        // won't handle them as real unary operators since they do not appear inside
        // expressions (apart from bang that is NOT operator). Colorizer will see them
        // and colorize as needed, but parser generally doesn't care as this is not
        // a real assembler with actual code generation.
        this.addTokenAndMove(TokenType.Operator, this._cs.position, TokenSubType.Noop);
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
        this._pastLabel = false;
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

  // Handle more complicated cases.
  private handleOtherChars(): void {
    // Labels only appear first in line.
    // TODO: At the moment we don't care about cases like
    // /* */ /* */ ... label: instruction.
    if (!this._pastLabel && this.tryLabel()) {
      this._pastLabel = true;
      return;
    }
    if (this.tryDirective()) {
      return;
    }
    // A symbol?
    this.handleSymbolOrUnknown();
  }

  // Attempt to determine if sequence is a label.
  private tryLabel(): boolean {
    if (!this.isPositionFirstInLine()) {
      return false;
    }
    // https://sourceware.org/binutils/docs/as/Symbol-Names.html
    // Symbol starts with _, $ or a letter, then can contain underscores,/ dollar signs, letters or digits.
    // Exception is local labels which are numbers possible ending with dollar signs and optionally, 'b' or 'f'.
    // TODO: Currently we consider labels ending in colon. ARM labels without colons are not yet supported.
    const start = this._cs.position;
    const ch = this._cs.currentChar;

    if (isLeadingSymbolCharacter(ch)) {
      // Regular label. Skip first char, then letters, underscores, digits,
      // dollar signs until colon, whitespace, odd characters or EOL/EOF.
      this.skipSymbol();
    } else if (Character.isDecimal(ch)) {
      // Local label. 22:, 33$: or .L77$:
      this._cs.skipNonWsSequence((ch: number): boolean => {
        return Character.isDecimal(ch);
      });
      if (this._cs.currentChar === Char.$) {
        this._cs.skipNonWsSequence((ch: number): boolean => {
          return ch === Char.$;
        });
      }
    } else if (ch === Char.Period && this._cs.nextChar === Char.L) {
      // Local label .L77$: this is rare since it mostly appears in generated code
      // after as or ld transform local label names into .L?? form. Also allow dash here.
      this._cs.advance(2);
      this._cs.skipNonWsSequence((ch: number): boolean => {
        return (
          Character.isAnsiLetter(ch) ||
          Character.isDecimal(ch) ||
          ch === Char.Underscore ||
          ch === Char.$ ||
          ch === Char.Minus
        );
      });
    }

    // We must be at : now or else it is not label.
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
    const start = this._cs.position;
    this._cs.moveToNextChar();

    switch (this._cs.currentChar) {
      case Char._2:
      case Char._4:
      case Char._8:
        break;
      default:
        if (!Character.isAnsiLetter(this._cs.currentChar)) {
          return false;
        }
    }

    this._cs.moveToNextChar();
    this._cs.skipNonWsSequence((ch: number): boolean => {
      return Character.isAnsiLetter(ch) || Character.isDecimal(ch) || ch === Char.Underscore;
    });

    const length = this._cs.position - start;
    if (length === 0) {
      return false;
    }

    // We must be at whitespace or else this is not a directive.
    if (this._cs.isWhiteSpace() || this._cs.isEndOfStream()) {
      const token = this.addToken(TokenType.Directive, start, length);

      const text = this._cs.text.getText(start, length);
      if (Directive.isDefinition(text)) {
        token.subType = TokenSubType.Definition;
      } else if (Directive.isDeclaration(text)) {
        token.subType = TokenSubType.Declaration;
      }

      return true;
    }

    this._cs.position = start;
    return false;
  }

  private handleSymbolOrUnknown(): void {
    //https://sourceware.org/binutils/docs-2.26/as/Symbol-Intro.html#Symbol-Intro
    const start = this._cs.position;
    this.skipSymbol();

    if (this._cs.position > start) {
      const token = new Token(TokenType.Symbol, start, this._cs.position - start);
      this._tokens.push(token);

      const text = this._cs.text.getText(token.start, token.length);
      if (isRegisterName(text, this._options.isA64)) {
        token.subType = TokenSubType.Register;
      }
      return;
    }

    // Unclear what it is. Skip unknown stuff, but do stop at important
    // characters, like potential comments, comma, operators.
    this._cs.skipNonWsSequence((ch: number): boolean => {
      return !isHardStopCharacter(ch);
    });
    if (this._cs.position > start) {
      this.addToken(TokenType.Unknown, start, this._cs.position - start);
    }
  }

  // Handle generic comment that spans to the end of the line.
  // Comment explicitly terminate current statement, no next
  // line continuation is allowed.
  private isAtLineComment(): boolean {
    switch (this._cs.currentChar) {
      case Char.Hash:
        // GNU # comment, must start at the beginning of the line.
        // TODO: support GNU preprocessing instructions, like #IF? This
        // would be for semantic coloring or special completions after #.
        return this._options.hashComments && (Character.isNewLine(this._cs.prevChar) || this._cs.position === 0);

      case Char.Slash:
        return this._options.cLineComments && this._cs.nextChar === Char.Slash;

      default:
        return this._options.lineCommentChar.charCodeAt(0) === this._cs.currentChar;
    }
  }

  private isAtBlockComment(): boolean {
    return this._options.cBlockComments && this._cs.currentChar === Char.Slash && this._cs.nextChar === Char.Asterisk;
  }

  private handleLineComment(): void {
    const start = this._cs.position;
    this._cs.moveToEol();

    const length = this._cs.position - start;
    if (length > 0) {
      this.addToken(TokenType.LineComment, start, length);
    }
  }

  private handleCBlockComment(): void {
    if (!this.isAtBlockComment()) {
      return;
    }

    const start = this._cs.position;
    this._cs.advance(2); // Skip /*
    while (!this._cs.isEndOfStream()) {
      if (this._cs.currentChar === Char.Asterisk && this._cs.nextChar === Char.Slash) {
        this._cs.advance(2);
        break;
      }
      this._cs.moveToNextChar();
    }
    this.addToken(TokenType.BlockComment, start, this._cs.position - start);
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
    // Immediate can be anything - a number (most commn case) such as #0x1,
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
    // Rememeber, we are past # at this point, so don't advance.
    if (this._cs.currentChar === Char.OpenBrace.valueOf()) {
      this.addToken(TokenType.Operator, start, 1, TokenSubType.Noop);
    } else {
      this.addToken(TokenType.Unknown, start, 1);
    }
    return true;
  }

  private addToken(type: TokenType, start: number, length: number, tokenSubType?: TokenSubType): Token {
    const token = new Token(type, start, length);
    if (tokenSubType) {
      token.subType = tokenSubType;
    }
    this._tokens.push(token);
    return token;
  }

  private addTokenAndMove(type: TokenType, start: number, tokenSubType?: TokenSubType): void {
    this.addToken(type, start, 1, tokenSubType);
    this._cs.moveToNextChar();
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

    // \foo is a reference to the macro parameters
    const start = this._cs.position;
    if (this._cs.currentChar === Char.Backslash) {
      this._cs.moveToNextChar();
    }

    if (!isLeadingSymbolCharacter(this._cs.currentChar)) {
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
}

function isLeadingSymbolCharacter(ch: number): boolean {
  return Character.isAnsiLetter(ch) || ch === Char.Underscore;
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
      return true;
  }
  return false;
}
