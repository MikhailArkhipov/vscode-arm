// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.
// Partially based on
//  https://github.com/microsoft/pyright/blob/main/packages/pyright-internal/src/parser/tokenizer.ts
//  https://github.com/MikhailArkhipov/vscode-r/tree/master/src/Languages/Core/Impl/Tokens

import { AssemblerConfig } from '../core/syntaxConfig';
import { Char, Character } from '../text/charCodes';
import { CharacterStream } from '../text/characterStream';
import { TextProvider } from '../text/text';
import { TextRangeCollection } from '../text/textRangeCollection';
import { NumberTokenizer } from './numberTokenizer';
import { Token, TokenType } from './tokens';

export class Tokenizer {
  private readonly _config: AssemblerConfig;
  private _numberTokenizer: NumberTokenizer;
  private _cs: CharacterStream;
  private _tokens: Token[] = [];
  private _pastLabel = false;

  constructor(config: AssemblerConfig) {
    this._config = config;
  }

  public tokenize(textProvider: TextProvider, start: number, length: number): TextRangeCollection<Token> {
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
    return new TextRangeCollection(this._tokens);
  }

  // [label:] [instruction] [sequence[, sequence[, ...]]] [//|@] comment <eol>
  private addNextToken(): void {
    this.skipWhitespace();

    if (this.tryNumber()) {
      return;
    }
    if (this.tryBasicChars()) {
      return;
    }

    // Handle possible comments
    this.handleCBlockComment();
    if (this.isAtLineComment()) {
      this.handleLineComment();
    }
    this.handleOtherChars();
  }

  private tryNumber(): boolean {
    const start = this._cs.position;
    const length = this._numberTokenizer.tryNumber();
    if (length > 0) {
      this.addToken(TokenType.Number, start, length);
      return true;
    }
    return false;
  }

  private tryBasicChars(): boolean {
    switch (this._cs.currentChar) {
      case Char.Equal:
      case Char.Plus:
      case Char.Minus:
        this.addTokenAndMove(TokenType.Operator, this._cs.position);
        return true;
      case Char.ExclamationMark:
        this.addTokenAndMove(TokenType.Exclamation, this._cs.position);
        return true;
      case Char.OpenBracket:
        this.addTokenAndMove(TokenType.OpenBracket, this._cs.position);
        return true;
      case Char.CloseBracket:
        this.addTokenAndMove(TokenType.CloseBracket, this._cs.position);
        return true;
      case Char.OpenBrace:
        this.addTokenAndMove(TokenType.OpenCurly, this._cs.position);
        return true;
      case Char.CloseBrace:
        this.addTokenAndMove(TokenType.CloseCurly, this._cs.position);
        return true;
      case Char.OpenParenthesis:
        this.addTokenAndMove(TokenType.OpenBrace, this._cs.position);
        return true;
      case Char.CloseParenthesis:
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
        this.handleString();
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
    // Immediate? GNU also permits '$'
    if (this._cs.currentChar === Char.Hash || this._cs.currentChar === Char.$) {
      this.handleImmediate();
      return;
    }
    // A symbol?
    this.handleSymbolOrSequence();
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

    if (Character.isAnsiLetter(ch) || ch === Char.Underscore) {
      // Regular label. Skip first char, then letters, underscores, digits,
      // dollar signs until colon, whitespace, odd characters or EOL/EOF.
      this._cs.moveToNextChar();
      this.skipSymbol();
    } else if (Character.isDecimal(ch)) {
      // Local label. 22:, 33$: or .L77$:
      this._cs.skipSequence((ch: number): boolean => {
        return Character.isDecimal(ch);
      });
      if (this._cs.currentChar === Char.$) {
        this._cs.skipSequence((ch: number): boolean => {
          return ch === Char.$;
        });
      }
    } else if (ch === Char.Period && this._cs.nextChar === Char.L) {
      // Local label .L77$: this is rare since it mostly appears in generated code
      // after as or ld transform local label names into .L?? form. Also allow dash here.
      this._cs.advance(2);
      this._cs.skipSequence((ch: number): boolean => {
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
    if (this._cs.currentChar !== Char.Period) {
      return false;
    }
    const start = this._cs.position;
    this._cs.moveToNextChar();

    if (!Character.isAnsiLetter(this._cs.currentChar) && this._cs.currentChar !== Char.Underscore.valueOf()) {
      return false;
    }

    this._cs.moveToNextChar();
    this._cs.skipSequence((ch: number): boolean => {
      return Character.isAnsiLetter(ch) || Character.isDecimal(ch) || ch === Char.Underscore;
    });

    const length = this._cs.position - start;
    if (length === 0) {
      return false;
    }

    // We must be at whitespace or else this is not a directive.
    if (this._cs.isWhiteSpace() || this._cs.isEndOfStream()) {
      this.addToken(TokenType.Directive, start, length);
      return true;
    }

    this._cs.position = start;
    return false;
  }

  private handleSymbolOrSequence(): void {
    //https://sourceware.org/binutils/docs-2.26/as/Symbol-Intro.html#Symbol-Intro
    const start = this._cs.position;
    if (Character.isAnsiLetter(this._cs.currentChar)) {
      this.skipSymbol();
    }

    const length = this._cs.position - start;
    if (length === 0) {
      // Unclear what it is. Just skip to whitespace and record as a sequence.
      this._cs.skipToWhitespace();
      if (this._cs.position > start) {
        this.addToken(TokenType.Sequence, start, this._cs.position - start);
      }
      return;
    }

    this.addToken(TokenType.Symbol, start, length);
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
        return this._config.hashComments && (Character.isNewLine(this._cs.prevChar) || this._cs.position === 0);

      case Char.Slash:
        return this._config.cLineComments && this._cs.nextChar === Char.Slash;

      default:
        return this._config.lineCommentChar.charCodeAt(0) === this._cs.currentChar;
    }
  }

  private isAtBlockComment(): boolean {
    return this._config.cBlockComments && this._cs.currentChar === Char.Slash && this._cs.nextChar === Char.Asterisk;
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

  private addToken(type: TokenType, start: number, length: number): void {
    const token = new Token(type, start, length);
    this._tokens.push(token);
  }

  private addTokenAndMove(type: TokenType, start: number): void {
    this.addToken(type, start, 1);
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

  private skipSymbol(): void {
    this._cs.skipSequence((ch: number): boolean => {
      return Character.isAnsiLetter(ch) || Character.isDecimal(ch) || ch === Char.Underscore || ch === Char.$;
    });
  }

  private handleString(): void {
    const start = this._cs.position;
    const openQuote = this._cs.currentChar;

    this._cs.moveToNextChar();
    this._cs.skipSequence((ch: number): boolean => {
      return ch !== openQuote;
    });

    if (this._cs.currentChar === openQuote) {
      this._cs.moveToNextChar();
    }
    this.addToken(TokenType.String, start, this._cs.position - start);
  }

  private handleImmediate(): void {
    const start = this._cs.position;
    // Skip hash/dollar, but remember actual start position
    this._cs.moveToNextChar();
    if(this.tryNumber()) {
      return;
    }
    // Possibly #:lower16:label
    if (this._cs.currentChar === Char.Colon) {
      this._cs.moveToNextChar;
      this._cs.skipSequence((e) => e !== Char.Colon && e !== Char.At);
    }
    this.skipSymbol();
    if(this._cs.position - start > 1) {
      // File immediate as a number anyway. This helps colorizer
      // and validator. Validator can dive into specific format eventually
      // and validate :abc: sequences as well as label references.
      this.addToken(TokenType.Number, start, this._cs.position - start);
    }
  }

  private isRegister(start: number, length: number): boolean {
    if (length < 2 || length > 3) {
      return false;
    }

    const t = this._cs.text.getText(start, length).toUpperCase();
    const ch1 = t.charCodeAt(0);
    const ch2 = t.charCodeAt(1);
    const ch3 = length === 3 ? t.charCodeAt(2) : Char._1;

    if ((ch1 === Char.R || ch1 === Char.X) && Character.isDecimal(ch2) && Character.isDecimal(ch3)) {
      return true;
    }

    if (length === 2) {
      if (ch1 === Char.S && ch2 === Char.P) {
        return true;
      }
      if (ch1 === Char.F && ch2 === Char.P) {
        return true;
      }
    }
    return false;
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
