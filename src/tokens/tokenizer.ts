// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.
// Partially based on
//  https://github.com/microsoft/pyright/blob/main/packages/pyright-internal/src/parser/tokenizer.ts
//  https://github.com/MikhailArkhipov/vscode-r/tree/master/src/Languages/Core/Impl/Tokens

import { AssemblerConfig } from '../syntaxConfig';
import { Char, Character } from '../text/charCodes';
import { CharacterStream } from '../text/characterStream';
import { TextProvider } from '../text/text';
import { TextRangeCollection } from '../text/textRangeCollection';
import { Token, TokenType } from './tokens';

const endOfStreamToken = new Token(TokenType.EndOfStream, 0, 0);

export class Tokenizer {
  private readonly _config: AssemblerConfig;
  private _cs: CharacterStream;
  private _tokens: Token[] = [];
  private _separateComments: boolean;
  private _comments: Token[] = [];
  private _text: TextProvider;
  private _pastLabel = false;
  private _pastInstruction = false;

  constructor(config: AssemblerConfig) {
    this._config = config;
  }

  public tokenize(
    textProvider: TextProvider,
    start: number,
    length: number,
    separateComments: boolean
  ): {
    tokens: TextRangeCollection<Token>;
    comments: TextRangeCollection<Token>;
  } {
    this._cs = new CharacterStream(textProvider);
    this._cs.position = start;

    this._separateComments = separateComments;
    this._comments = [];
    this._tokens = [];
    this._text = textProvider;
    this._pastLabel = this._pastInstruction = false;

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
    return {
      tokens: new TextRangeCollection(this._tokens),
      comments: new TextRangeCollection(this._comments),
    };
  }

  // [label:] [instruction] [sequence[, sequence[, ...]]] [//|@] comment <eol>
  private addNextToken(): void {
    this.skipWhitespace();

    switch (this._cs.currentChar) {
      case Char.Equal:
      case Char.Plus:
      case Char.Minus:
        this.addTokenAndMove(TokenType.Operator, this._cs.position);
        return;
      case Char.ExclamationMark:
        this.addTokenAndMove(TokenType.Exclamation, this._cs.position);
        return;
      case Char.OpenBracket:
        this.addTokenAndMove(TokenType.OpenBracket, this._cs.position);
        return;
      case Char.CloseBracket:
        this.addTokenAndMove(TokenType.CloseBracket, this._cs.position);
        return;
      case Char.OpenBrace:
        this.addTokenAndMove(TokenType.OpenCurly, this._cs.position);
        return;
      case Char.CloseBrace:
        this.addTokenAndMove(TokenType.CloseCurly, this._cs.position);
        return;
      case Char.OpenParenthesis:
        this.addTokenAndMove(TokenType.OpenBrace, this._cs.position);
        return;
      case Char.CloseParenthesis:
        this.addTokenAndMove(TokenType.CloseBrace, this._cs.position);
        return;
      case Char.Comma:
        this.addTokenAndMove(TokenType.Comma, this._cs.position);
        return;

      case Char.LineFeed:
      case Char.CarriageReturn:
        this.handleLineBreak();
        this._pastLabel = this._pastInstruction = false;
        return;

      case Char.SingleQuote:
      case Char.DoubleQuote:
        this.handleString();
        return;

      default:
        // Handle possible comments
        this.handleCBlockComment();
        if (this.isAtLineComment()) {
          this.handleLineComment();
        }

        this.handleOtherChars();
        break;
    }
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
    // Not a label. Try instruction. Instructions appear first in line of after a label.
    if (!this._pastInstruction && this.tryInstructionOrDirective()) {
      this._pastLabel = this._pastInstruction = true;
      return;
    }
    // Handle other cases
    this.handleOperands();
  }

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
      this.skipSequence((ch: number): boolean => {
        return Character.isAnsiLetter(ch) || Character.isDecimal(ch) || ch === Char.Underscore || ch === Char.$;
      });
    } else if (Character.isDecimal(ch)) {
      // Local label. 22:, 33$: or .L77$:
      this.skipSequence((ch: number): boolean => {
        return Character.isDecimal(ch);
      });
      if (this._cs.currentChar === Char.$) {
        this.skipSequence((ch: number): boolean => {
          return ch === Char.$;
        });
      }
    } else if (ch === Char.Period && this._cs.nextChar === Char.L) {
      // Local label .L77$: this is rare since it mostly appears in generated code
      // after as or ld transform local label names into .L?? form. Also allow dash here.
      this._cs.advance(2);
      this.skipSequence((ch: number): boolean => {
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

  private tryInstructionOrDirective(): boolean {
    if (!this.isPositionAfterLabelOrAtLineStart()) {
      return false;
    }
    // Instructions begin with letters. Numbers can appear before period.
    // Instructions allow suffixes that may contain other periods. Ex .F32.F64 suffix in NEON.
    // Here we do not perform complete syntax check or verify against list
    // of valid instructions. Tokenizer only supplies candidates: reasonable name
    // filtration as well as check in the caller that the instruction either appear
    // first in line or sits right after the label.
    const start = this._cs.position;
    const directive = this._cs.currentChar === Char.Period;
    if (directive) {
      this._cs.moveToNextChar();
    }

    const validFirstChar = Character.isAnsiLetter(this._cs.currentChar) || this._cs.currentChar === Char.Underscore;
    if (!validFirstChar) {
      return false;
    }

    this._cs.moveToNextChar();
    this.skipSequence((ch: number): boolean => {
      return Character.isAnsiLetter(ch) || Character.isDecimal(ch) || ch === Char.Period || ch === Char.Underscore;
    });

    const length = this._cs.position - start;
    if (length === 0) {
      return false;
    }

    if (length > 1 && directive) {
      this.addToken(TokenType.Directive, start, length);
    } else {
      this.addToken(TokenType.Instruction, start, length);
    }
    return true;
  }

  private handleOperands(): void {
    if (this._cs.currentChar === Char.Hash) {
      this.handleImmediate();
      return;
    }

    if (Character.isDecimal(this._cs.currentChar)) {
      this.handleNumber(this._cs.position);
      return;
    }

    const start = this._cs.position;
    if (Character.isAnsiLetter(this._cs.currentChar)) {
      this.skipSequence((ch: number): boolean => {
        return Character.isAnsiLetter(ch) || Character.isDecimal(ch) || ch === Char.Underscore || ch === Char.$;
      });
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
    
    if (this._pastInstruction && this.isRegister(start, length)) {
      this.addToken(TokenType.Register, start, length);
    } else {
      this.addToken(TokenType.Sequence, start, length);
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
      this.addComment(TokenType.LineComment, start, length);
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
    this.addComment(TokenType.BlockComment, start, this._cs.position - start);
  }

  private handleLineBreak(): void {
    if (this._cs.isAtNewLine()) {
      const start = this._cs.position;
      this._cs.skipLineBreak();
      this.addToken(TokenType.EndOfLine, start, this._cs.position - start);
    }
  }

  private addComment(tokenType: TokenType, start: number, length: number): void {
    if (this._separateComments) {
      this._comments.push(new Token(tokenType, start, length));
    } else {
      this.addToken(tokenType, start, length);
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

  private handleString(): void {
    const start = this._cs.position;
    const openQuote = this._cs.currentChar;

    this._cs.moveToNextChar();
    this.skipSequence((ch: number): boolean => {
      return ch !== openQuote;
    });

    if (this._cs.currentChar === openQuote) {
      this._cs.moveToNextChar();
    }
    this.addToken(TokenType.String, start, this._cs.position - start);
  }

  private handleImmediate(): void {
    const start = this._cs.position;
    this._cs.moveToNextChar();
    this.handleNumber(start);
  }

  private handleNumber(start: number): void {
    if (this.skipNumber()) {
      this.addToken(TokenType.Number, start, this._cs.position - start);
    } else {
      this.addToken(TokenType.Sequence, start, this._cs.position - start);
    }
  }

  private skipNumber(): boolean {
    // Skip leading plus or minus
    if(this._cs.currentChar === Char.Minus || this._cs.currentChar === Char.Plus) {
      this._cs.moveToNextChar();
    }
    
    // Skip leading '0x', if any
    const hex = this._cs.currentChar === Char._0 && (this._cs.nextChar === Char.x || this._cs.nextChar === Char.X);
    if (hex) {
      this._cs.advance(2);
    }

    // TODO: floating point?
    const start = this._cs.position;
    this.skipSequence((ch: number): boolean => {
      if (hex) {
        if (!Character.isHex(ch)) {
          return false;
        }
      } else {
        if (!Character.isDecimal(ch)) {
          return false;
        }
      }
      return true;
    });

    // Sanity check - number ends in whitespace, line break, operator, string,
    // or a comma. 2R, 1_3 are not numbers.
    if (!this._cs.isWhiteSpace() && !this._cs.isEndOfStream()) {
      if (Character.isLetter(this._cs.currentChar) || this._cs.currentChar === Char.Underscore) {
        return false;
      }
    }
    return this._cs.position - start > 0;
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
      switch (t.tokenType) {
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

  // Checks if position is first in line, preceded by only
  // block comments or a label.
  // Example: \nFoo, \n/* */ Foo, \n/* */ Foo: /* */ Bar, etc.
  private isPositionAfterLabelOrAtLineStart(): boolean {
    for (let i = this._tokens.length - 1; i >= 0; i--) {
      const t = this._tokens[i];
      switch (t.tokenType) {
        case TokenType.EndOfLine:
          return true;
        case TokenType.BlockComment:
          continue;
        case TokenType.Label:
          return true;
        default:
          return false;
      }
    }
    return true;
  }

  private isPositionAfterInstruction(): boolean {
    for (let i = this._tokens.length - 1; i >= 0; i--) {
      const t = this._tokens[i];
      switch (t.tokenType) {
        case TokenType.EndOfLine:
          return false;
        case TokenType.BlockComment:
          continue;
        case TokenType.Instruction:
          return true;
        default:
          return false;
      }
    }
    return false;
  }

  private lastToken(): Token {
    return this._tokens.length > 0 ? this._tokens[this._tokens.length - 1] : endOfStreamToken;
  }

  private skipSequence(check: (ch: number) => boolean): void {
    while (!this._cs.isEndOfStream() && !this._cs.isAtNewLine() && check(this._cs.currentChar)) {
      this._cs.moveToNextChar();
    }
  }
}
