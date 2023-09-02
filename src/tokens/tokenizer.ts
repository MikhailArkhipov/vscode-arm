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
  private _text: TextProvider;

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
    this._text = textProvider;

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
        return;

      default:
        if (this._cs.isAtNewLine()) {
          this.handleLineBreak();
          return;
        }
        break;
    }

    this.handleOther();
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
    var start = this._cs.position;
    this.skipWord();

    var length = this._cs.position - start;
    var tokenText = this._text.getText(start, length);

    if (this.isLabel(tokenText, start, length)) {
      this.addToken(TokenType.Label, start, length);
      return;
    }

    var prevToken = this.getPreviousNonCommentToken();
    if (
      prevToken.tokenType === TokenType.EndOfStream ||
      prevToken.tokenType === TokenType.EndOfLine ||
      prevToken.tokenType === TokenType.Label
    ) {
      if (tokenText.charCodeAt(0) === Char.Period && this.isSymbol(tokenText.substring(1, length - 1))) {
        this.addToken(TokenType.Directive, start, length);
        return;
      }

      if (this.isInstructionName(tokenText)) {
        this.addToken(TokenType.Instruction, start, length);
        return;
      }
    }

    this.addToken(TokenType.Word, start, length);
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
    return this._config.cBlockComments && this._cs.nextChar === Char.Asterisk;
  }

  private addLineComment(): void {
    var start = this._cs.position;
    this._cs.moveToEol();

    var length = this._cs.position - start;
    if (length > 0) {
      this.addComment(TokenType.LineComment, start, length);
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

  private addComment(tokenType: TokenType, start: number, length: number): void {
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

  private skipWord(): void {
    while (
      !this._cs.isEndOfStream() &&
      !this._cs.isWhiteSpace() &&
      this._cs.currentChar !== Char.Comma &&
      !this._cs.isAtString() &&
      !this.isAtLineComment() &&
      !this.isAtBlockComment()
    ) {
      this._cs.moveToNextChar();
    }
  }

  private isSymbol(symbol: string): boolean {
    // GCC https://sourceware.org/binutils/docs-2.26/as/Symbol-Names.html#Symbol-Names
    // Symbol names begin with a letter or with one of `._'. On most machines, you can
    // also use $ in symbol names; exceptions are noted in Machine Dependencies.
    // That character may be followed by any string of digits, letters, dollar signs
    // (unless otherwise noted for a particular target machine), and underscores.
    // Case of letters is significant: foo is a different symbol name than Foo.
    // Symbol names do not start with a digit.
    // TODO: Local labels like '1:' NYI. Same for Unicode label and variable names.
    var matches = symbol.match(/([a-zA-Z_]+)([a-zA-Z0-9_]*)/g);
    return matches != null && matches.length === 1 && matches[0] === symbol;
  }

  private isLabel(tokenText: string, start: number, length: number): boolean {
    // Label must be the first element in line.
    // TODO: not sure if we care about '/* comment */ _label:' case.
    // This would be tricky to handle since in AST case comment tokens
    // are not in the stream while in formatting case they are here.
    var prevToken = this.getPreviousNonCommentToken();
    if (prevToken && prevToken.tokenType !== TokenType.EndOfLine && prevToken.tokenType !== TokenType.EndOfStream) {
      return false;
    }
    // No previous token (start of the file) or it is a line break,
    // so we are at the start of the line.
    if (this._config.colonInLabels) {
      if (tokenText.charCodeAt(tokenText.length - 1) !== Char.Colon) {
        return false;
      }
    } else {
      // ARM UAL requires labels at the beginning of the line.
      if (start > 0) {
        return false;
      }
    }
    var symbol = tokenText.substring(0, length - (this._config.colonInLabels ? 1 : 0));
    return this.isSymbol(symbol);
  }

  // Instruction is a symbol but may contain a single period followed by a modifier.
  // Modifier is letter(s) followed optionally by number(s).
  // Example: BCS.W or LDR.I8
  private isInstructionName(text: string): boolean {
    // INSTR6.I8 - either all upper or all lower case
    var matches = text.match(/[A-Z]+[0-9]*[\.]?[A-Z]*[0-9]?/g);
    if (matches != null && matches.length === 1 && matches[0] === text) {
      return true;
    }
    matches = text.match(/[a-z]+[0-9]*[\.]?[a-z]*[0-9]?/g);
    return matches != null && matches.length === 1 && matches[0] === text;
  }

  private getPreviousNonCommentToken(): Token {
    // Walk back skipping any block comments
    for (var i = this._tokens.length - 1; i >= 0; i--) {
      var t = this._tokens[i];
      if (t.tokenType === TokenType.EndOfLine || t.tokenType === TokenType.EndOfStream) {
        return t;
      }
      if (t.tokenType !== TokenType.BlockComment) {
        return t;
      }
    }
    return new Token(TokenType.EndOfStream, 0, 0);
  }
}
