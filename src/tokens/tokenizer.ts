// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.
// Partially based on
//  https://github.com/microsoft/pyright/blob/main/packages/pyright-internal/src/parser/tokenizer.ts
//  https://github.com/MikhailArkhipov/vscode-r/tree/master/src/Languages/Core/Impl/Tokens

import { AssemblerConfig } from "../syntaxConfig";
import { Char, Character } from "../text/charCodes";
import { CharacterStream } from "../text/characterStream";
import { Text, TextProvider } from "../text/text";
import { TextRangeCollection } from "../text/textRangeCollection";
import { Token, TokenType } from "./tokens";

export class Tokenizer {
  private readonly _config: AssemblerConfig;
  private _cs: CharacterStream;
  private _tokens: Token[] = [];
  private _separateComments: boolean;
  private _comments: Token[] = [];
  private _text: TextProvider;

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

    var end = Math.min(textProvider.length, start + length);
    while (!this._cs.isEndOfStream() && this._cs.position < end) {
      var start = this._cs.position;
      this.addNextLine();
      this.handleLineBreak();

      // If token was added, the position must change.
      if (this._cs.position === start && !this._cs.isEndOfStream()) {
        // We must advance or tokenizer hangs
        throw new Error("Tokenizer: infinite loop");
      }
    }
    return {
      tokens: new TextRangeCollection(this._tokens),
      comments: new TextRangeCollection(this._comments),
    };
  }

  // [label:] [instruction] [sequence[, sequence[, ...]]] [//|@] comment <eol>
  private addNextLine(): void {
    // Possible /* */ before label
    this.skipWhitespace();
    this.handleCBlockComment();

    this.skipWhitespace();
    this.handleLabel();
    this.skipWhitespace();

    // Possible /* */ before instruction
    this.handleCBlockComment();
    this.skipWhitespace();

    this.handleInstruction();
    this.skipWhitespace();

    // Possible /* */ before operands
    this.handleCBlockComment();
    this.handleOperands();
    this.skipWhitespace();

    // Possible /* */ before line comment
    this.handleCBlockComment();
    this.skipWhitespace();

    this.handleLineComment();
    this.skipWhitespace();
  }

  private handleLabel(): void {
    var start = this._cs.position;
    // Try label. Skip to after :, to comma, whitespace or <eol>
    this.skipWord(true);

    var length = this._cs.position - start;
    if (length > 0) {
      if (this._cs.prevChar === Char.Colon) {
        // Looks like a label. We are not going to ensure that this is indeed
        // a label, we'll let parser to perform name check.
        this.addToken(TokenType.Label, start, length);
        return;
      }
    }
    this._cs.position = start;
  }

  private handleInstruction(): void {
    var start = this._cs.position;
    this.skipWord(false);

    var length = this._cs.position - start;
    if (length > 0) {
      if (this._cs.text.getText(start, 1) === ".") {
        this.addToken(TokenType.Directive, start, length);
      } else {
        this.addToken(TokenType.Instruction, start, length);
      }
    }
  }

  private handleOperands(): void {
    // Split sequence into '? comma ? comma ...' where '?' is any character
    // sequence except comments. The sequence may include inner whitespace,
    // leading and trailing are trimmed down.
    while (!this._cs.isAtNewLine() && !this._cs.isEndOfStream()) {
      this.skipWhitespace();
      // Possible /* */
      this.handleCBlockComment();

      var start = this._cs.position;
      this.skipSequence();
      var length = this._cs.position - start;
      if (length > 0) {
        this.addToken(TokenType.Sequence, start, length);
      }

      this.skipWhitespace();
      // Possible /* */
      this.handleCBlockComment();

      if (this._cs.currentChar === Char.Comma) {
        this.addTokenAndMove(TokenType.Comma, this._cs.position);
      } else {
        break;
      }
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
        return (
          this._config.hashComments &&
          (Character.isNewLine(this._cs.prevChar) || this._cs.position === 0)
        );

      case Char.Slash:
        return this._config.cLineComments && this._cs.nextChar === Char.Slash;

      default:
        return (
          this._config.lineCommentChar.charCodeAt(0) === this._cs.currentChar
        );
    }
  }

  private isAtBlockComment(): boolean {
    return (
      this._config.cBlockComments &&
      this._cs.currentChar === Char.Slash &&
      this._cs.nextChar === Char.Asterisk
    );
  }

  private handleLineComment(): void {
    if (!this.isAtLineComment()) {
      return;
    }

    var start = this._cs.position;
    this._cs.moveToEol();

    var length = this._cs.position - start;
    if (length > 0) {
      this.addComment(TokenType.LineComment, start, length);
    }
  }

  private handleCBlockComment(): void {
    if (!this.isAtBlockComment()) {
      return;
    }

    var start = this._cs.position;
    this._cs.advance(2); // Skip /*
    while (!this._cs.isEndOfStream()) {
      if (
        this._cs.currentChar === Char.Asterisk &&
        this._cs.nextChar === Char.Slash
      ) {
        this._cs.advance(2);
        break;
      }
      this._cs.moveToNextChar();
    }
    this.addComment(TokenType.BlockComment, start, this._cs.position - start);
  }

  private handleLineBreak(): void {
    if (this._cs.isAtNewLine()) {
      var start = this._cs.position;
      this._cs.skipLineBreak();
      this.addToken(TokenType.EndOfLine, start, this._cs.position - start);
    }
  }

  private addComment(
    tokenType: TokenType,
    start: number,
    length: number
  ): void {
    if (this._separateComments) {
      this._comments.push(new Token(tokenType, start, length));
    } else {
      this.addToken(tokenType, start, length);
    }
  }

  private addToken(type: TokenType, start: number, length: number): void {
    var token = new Token(type, start, length);
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

  // Word is any non-whitespace sequence, optionally breaking after colon.
  // Help with extraction of labels and instruction names.
  private skipWord(breakOnColon: boolean): void {
    while (
      !this._cs.isEndOfStream() &&
      !this._cs.isAtNewLine() &&
      !this._cs.isWhiteSpace() &&
      this._cs.currentChar !== Char.Comma &&
      !this._cs.isAtString() &&
      !this.isAtLineComment() &&
      !this.isAtBlockComment()
    ) {
      this._cs.moveToNextChar();
      if (breakOnColon && this._cs.prevChar === Char.Colon) {
        break;
      }
    }
  }

  // Sequence may contain whitepace and strings. For example,
  // expression between commas: INSTR x1, x2, (1 + 'a').
  // This may change if expression parsing gets implemented.
  private skipSequence(): void {
    var start = this._cs.position;
    var lastNonWsPosition = this._cs.position;
    while (
      !this._cs.isEndOfStream() &&
      !this._cs.isAtNewLine() &&
      this._cs.currentChar !== Char.Comma &&
      !this.isAtLineComment() &&
      !this.isAtBlockComment()
    ) {
      if (!this._cs.isWhiteSpace()) {
        lastNonWsPosition = this._cs.position;
      }
      this._cs.moveToNextChar();
    }
    if (
      this._cs.position > start &&
      Character.isWhitespace(this._cs.prevChar)
    ) {
      this._cs.position = lastNonWsPosition + 1;
    }
  }
}
