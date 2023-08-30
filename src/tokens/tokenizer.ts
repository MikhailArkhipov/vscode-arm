// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.
// Partially based on
//  https://github.com/microsoft/pyright/blob/main/packages/pyright-internal/src/parser/tokenizer.ts
//  https://github.com/MikhailArkhipov/vscode-r/tree/master/src/Languages/Core/Impl/Tokens

import { AssemblerConfig } from "../syntaxConfig";
import { Char, Character } from "../text/charCodes";
import { CharacterStream } from "../text/characterStream";
import { TextProvider } from "../text/text";
import { TextRangeCollection } from "../text/textRangeCollection";
import { Token, TokenType } from "./tokens";

export class Tokenizer {
  private readonly _config: AssemblerConfig;
  private _cs: CharacterStream;
  private _tokens: Token[] = [];
  private _separateComments: boolean;
  private _comments: Token[] = [];

  constructor(config: AssemblerConfig) {
    this._config = config;
  }

  public tokenize(
    textProvider: TextProvider,
    start: number,
    length: number,
    separateComments: boolean
  ): { tokens: TextRangeCollection<Token>; comments: TextRangeCollection<Token> } {
    this._cs = new CharacterStream(textProvider);
    this._cs.position = start;

    this._separateComments = separateComments;
    this._comments = [];
    this._tokens = [];

    var end = Math.min(textProvider.length, start + length);
    while (!this._cs.isEndOfStream() && this._cs.position < end) {
      var start = this._cs.position;
      // Keep on adding tokens
      this.addNextToken();

      // If token was added, the position must change.
      if (this._cs.position === start && !this._cs.isEndOfStream()) {
        // We must advance or tokenizer hangs
        throw new Error("Infinite loop in tokenizer");
      }
    }
    return { tokens: new TextRangeCollection(this._tokens), comments: new TextRangeCollection(this._comments) };
  }

  // Main tokenization method. Responsible for adding next token
  // to the list, if any. Proceeds the end of the character stream.
  private addNextToken(): void {
    this.skipWhitespace();

    if (this._cs.isEndOfStream()) {
      return;
    }

    if (this.isAtLineComment()) {
      this.addLineComment();
      return;
    }

    switch (this._cs.currentChar) {
      case Char.DoubleQuote:
        this.handleString();
        return;

      case Char.Slash:
        if (this.isAtBlockComment()) {
          this.handleCBlockComment();
          return;
        }
        break;

      case Char.Comma:
        this.addTokenAndMove(TokenType.Comma, this._cs.position);
        break;

      default:
        if (this._cs.isAtNewLine()) {
          this.handleLineBreak();
        }
        break;
    }

    this.handleWord();
  }

  // Double-quoted string with possible escapes.
  private handleString(): void {
    var start = this._cs.position;
    this._cs.moveToNextChar();

    if (!this._cs.isEndOfStream()) {
      while (true) {
        if (this._cs.currentChar === Char.DoubleQuote) {
          this._cs.moveToNextChar();
          break;
        }

        if (this._cs.currentChar == Char.Backslash) {
          this._cs.moveToNextChar();
        }

        if (!this._cs.moveToNextChar()) {
          break;
        }
      }
    }
    this.addToken(TokenType.String, start, this._cs.position - start);
  }

  private handleWord(): void {
    var start = this._cs.position;

    var length = this.getWordLength();
    if (length === 0) {
      this.addTokenAndMove(TokenType.Unknown, start);
    } else {
      this.addToken(TokenType.Word, start, length);
    }
  }

  private getWordLength(): number {
    var start = this._cs.position;
    this.skipWord(this._cs, (cs: CharacterStream) => {
      // Anything except strings, commas or comments
      return !cs.isAtString() && !this.isAtLineComment() && !this.isAtBlockComment();
    });
    return this._cs.position - start;
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
        return this._config.hashComments && Character.isNewLine(this._cs.prevChar);

      case Char.Slash:
        return this._config.cLineComments && this._cs.nextChar === Char.Slash;

      default:
        return this._config.lineCommentChar.charCodeAt(0) === this._cs.currentChar;
    }
  }

  private isAtBlockComment(): boolean {
    return this._config.cBlockComments && this._cs.nextChar === Char.Asterisk;
  }

  private addLineComment(): void {
    var start = this._cs.position;
    this._cs.moveToEol();

    var length = this._cs.position - start;
    if (length > 0) {
      this.addComment(start, length);
    }
  }

  private handleCBlockComment(): void {
    var start = this._cs.position;

    this._cs.advance(2); // Skip /*
    while (!this._cs.isEndOfStream()) {
      if (this._cs.currentChar === Char.Asterisk && this._cs.nextChar === Char.Slash) {
        this._cs.advance(2);
        break;
      }
    }
    this.addComment(start, this._cs.position - start);
  }

  private handleLineBreak(): void {
    if (this._cs.isAtNewLine()) {
      var start = this._cs.position;
      this._cs.skipLineBreak();
      this.addToken(TokenType.EndOfLine, start, this._cs.position - start);
    }
  }

  private addComment(start: number, length: number): void {
    if (this._separateComments) {
      this._comments.push(new Token(TokenType.Comment, start, length));
    } else {
      this.addToken(TokenType.Comment, start, length);
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

  // Skip over whitespace characters.
  private skipWhitespace(): void {
    if (this._cs.isEndOfStream()) {
      return;
    }

    while (this._cs.isWhiteSpace()) {
      if (this._cs.isAtNewLine()) {
        this.handleLineBreak();
      } else if (!this._cs.moveToNextChar()) {
        break;
      }
    }
  }

  private skipWord(cs: CharacterStream, isAllowedCharacter: (cs: CharacterStream) => boolean): void {
    while (!cs.isEndOfStream()) {
      if (cs.isWhiteSpace()) {
        break;
      }
      if (!isAllowedCharacter(cs)) {
        break;
      }
      cs.moveToNextChar();
    }
  }
}
