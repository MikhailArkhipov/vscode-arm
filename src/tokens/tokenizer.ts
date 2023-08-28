// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.
// Partially based on
//  https://github.com/microsoft/pyright/blob/main/packages/pyright-internal/src/parser/tokenizer.ts
//  https://github.com/MikhailArkhipov/vscode-r/tree/master/src/Languages/Core/Impl/Tokens

import { Char, Character } from "../text/charCodes";
import { CharacterStream } from "../text/characterStream";
import { TextProvider } from "../text/text";
import { TextRangeCollection } from "../text/textRangeCollection";
import { NumberTokenizer } from "./numberTokenizer";
import { Token, TokenType } from "./tokens";

export class AssemblerConfig {
  public assemblerName: string; // Human readable assembler name, such as 'GNU ARM', 'GCC' or 'CLang'.
  public commentsConfig: CommentsConfig; // Types of comment syntax supported.
  public statementSeparator: string; // Some assemblers support multiple statements in line, separated by semicolon.
}

export class CommentsConfig {
  public cLineComments: boolean; // Allow C++ type comments like //.
  public cBlockComments: boolean; // Allow C block comments aka /* */.
  public hashComments: boolean; // Allow # comments, provided # is the first character in line. Supported by GCC.
  public atComments: boolean; // '@ text', run to the end of the line
  public semicolonComments: boolean; // '; text', run to the end of the line
}

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
      // Keep on adding tokens
      this.addNextToken();
    }
    return { tokens: new TextRangeCollection(this._tokens), comments: new TextRangeCollection(this._comments) };
  }

  // Main tokenization method. Responsible for adding next token
  // to the list, if any. Proceeds the end of the character stream.
  private addNextToken(): void {
    var start = this._cs.position;
    this.skipWhitespace();

    if (this._cs.isEndOfStream()) {
      return;
    }

    switch (this._cs.currentChar) {
      case Char.DoubleQuote:
        this.handleString();
        return;

      case Char.Hash:
      case Char.Semicolon:
      case Char.At:
        // Parser handles immediates and directives syntax
        this.handlePossibleEolComment();
        return;

      case Char.Slash:
        if(this._config.commentsConfig.cLineComments && this._cs.nextChar === Char.Slash) {
          this.handlePossibleEolComment();
          return;
        }      
        if(this._config.commentsConfig.cBlockComments && this._cs.nextChar === Char.Asterisk) {
          this.handleCBlockComment();
          return;
        }      
        break;

      case Char.Comma:
        this.addTokenAndMove(TokenType.Comma, this._cs.position);
        break;

      case Char.Colon:
        // Parser handles label syntax
        this.addTokenAndMove(TokenType.Colon, this._cs.position);
        return;
    }

    // Try numbers
    if (NumberTokenizer.isPossibleNumber(this._cs)) {
      var start = this._cs.position;
      var length = NumberTokenizer.handleNumber(this._cs);
      if (length > 0) {
        this.addToken(TokenType.Number, start, length);
        return;
      }
    }

    // Not a number. Perhaps a directive? Parser handles directive syntax
    if (this._cs.currentChar === Char.Period) {
      this.addTokenAndMove(TokenType.Period, this._cs.position);
      return;
    }

    this.handleOther();

    if (this._cs.position === start) {
      // We must advance or tokenizer hangs
      throw new Error("Infinite loop in tokenizer");
    }
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

  private handleOther(): void {
    // TODO: when parsing expressions in immediates
    // If character is not a letter and not start of a string it
    // cannot be a keyword, function or variable name. Try operators
    // first since they are longer than puctuation.
    // if (HandleOperator()) {
    //    return;
    //}

    // Something unknown. Skip to whitespace and file it as unknown.
    // Note however, we should take # ito account as it starts comment
    var start = this._cs.position;
    this.addIdentifier();
  }

  private addIdentifier(): void {
    var start = this._cs.position;

    var length = this.getIdentifierLength();
    if (length === 0) {
      this.addTokenAndMove(TokenType.Unknown, start);
    } else {
      this.addToken(TokenType.Identifier, start, length);
    }
  }

  private getIdentifierLength(): number {
    var start = this._cs.position;
    Tokenizer.skipIdentifier(
      this._cs,
      (cs: CharacterStream) => {
        return Character.isAnsiLetter(cs.currentChar) || cs.currentChar === Char.$;
      },
      (cs: CharacterStream) => {
        return (
          Character.isAnsiLetter(cs.currentChar) ||
          Character.isDecimal(cs.currentChar) ||
          cs.currentChar === Char.Underscore ||
          cs.currentChar === Char.Period || // Mostly for instructions with modifiers
          cs.currentChar === Char.$
        );
      }
    );
    return this._cs.position - start;
  }

  // Handle generic comment that spans to the end of the line.
  // Comment explicitly terminate current statement, no next
  // line continuation is allowed.
  private handlePossibleEolComment(): void {
    switch (this._cs.currentChar) {
      case Char.Hash:
        // Possibly # comment, must start at the beginning of the line.
        // Typically GNU https://sourceware.org/binutils/docs/as/Comments.html
        // TODO: support GNU preprocessing instructions, like #IF? This
        // would be for semantic coloring or special completions after #.
        if (!this._config.commentsConfig || !Character.isNewLine(this._cs.prevChar)) {
          // Possible immediate value
          this.addTokenAndMove(TokenType.Hash, this._cs.position);
          return;
        }
        break;

      case Char.Semicolon:
        if (!this._config.commentsConfig.semicolonComments) {
          this.addTokenAndMove(TokenType.Unknown, this._cs.position);
          return;
        }
        break;

      case Char.At:
        if (!this._config.commentsConfig.atComments) {
          this.addTokenAndMove(TokenType.Unknown, this._cs.position);
          return;
        }
        break;
    }

    var start = this._cs.position;
    this._cs.moveToEol();

    var length = this._cs.position - start;
    if (length > 0) {
      this.addComment(start, length);
    }

    // Explicitly terminate statement
    var start = this._cs.position;
    this._cs.skipLineBreak();
    this.addToken(TokenType.EndOfLine, start, this._cs.position - start);
  }

  private handleCBlockComment(): void {
    var start = this._cs.position;
    
    this._cs.advance(2); // Skip /*
    while(!this._cs.isEndOfStream()) {
      if(this._cs.currentChar === Char.Asterisk && this._cs.nextChar === Char.Slash) {
        this._cs.advance(2);
        break;
      }
    }
    this.addComment(start, this._cs.position - start);
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

  private skipIdentifier(
    isIdentifierLeadCharacter: (cs: CharacterStream) => boolean,
    isIdentifierCharacter: (cs: CharacterStream) => boolean
  ): void {
    if (!isIdentifierLeadCharacter(this._cs)) {
      return;
    }

    if (this._cs.isEndOfStream()) {
      return;
    }

    while (!this._cs.isWhiteSpace()) {
      if (!isIdentifierCharacter(this._cs)) {
        break;
      }

      if (!this._cs.moveToNextChar()) {
        break;
      }
    }
  }

  // Skip over whitespace characters.
  private skipWhitespace(): void {
    if (this._cs.isEndOfStream()) {
      return;
    }

    while (this._cs.isWhiteSpace()) {
      if (!this._cs.moveToNextChar()) {
        break;
      }
    }
  }

  private skipUnknown(): void {
    while (!this._cs.isEndOfStream() && !this._cs.isWhiteSpace()) {
      // Break at possible comments in order to recover
      if (this._config.commentsConfig.semicolonComments && this._cs.currentChar === Char.Semicolon) {
        break;
      }
      if (this._config.commentsConfig.atComments && this._cs.currentChar === Char.At) {
        break;
      }
      this._cs.moveToNextChar();
    }
  }
}

export namespace Tokenizer {
  export function skipIdentifier(
    cs: CharacterStream,
    isIdentifierLeadCharacter: (cs: CharacterStream) => boolean,
    isIdentifierCharacter: (cs: CharacterStream) => boolean
  ): void {
    if (!isIdentifierLeadCharacter(cs)) {
      return;
    }

    if (cs.isEndOfStream()) {
      return;
    }

    while (!cs.isWhiteSpace()) {
      if (!isIdentifierCharacter(cs)) {
        break;
      }

      if (!cs.moveToNextChar()) {
        break;
      }
    }
  }
}
