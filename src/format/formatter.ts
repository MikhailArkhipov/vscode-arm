// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { AssemblerConfig } from "../syntaxConfig";
import { TextProvider } from "../text/text";
import { TextStream } from "../text/textStream";
import { TokenStream } from "../tokens/tokenStream";
import { Tokenizer } from "../tokens/tokenizer";
import { Token, TokenType } from "../tokens/tokens";

// Common assumptions
// - # comment starts at position 0
// - // comment starts at position 0
// - Determine longest label, then align instruction
//   at the next TAB position.
// - Detemine longest line at the end of instruction,
//   then align line comments to the next TAB position.

// NOT supporting tabs. Spaces only.
export class FormatOptions {
  public tabSize: number;
  public spaceAfterComma: boolean;
  public uppercaseLabels: boolean;
  public uppercaseDirectives: boolean;
  public uppercaseInstructions: boolean;
  public uppercaseRegisters: boolean;
  public ignoreComments: boolean;
}

export class Formatter {
  private _tokens: TokenStream;
  private _out: string[] = [];
  private _text: TextProvider;
  private _options: FormatOptions;

  public formatDocument(text: TextProvider, options: FormatOptions, config: AssemblerConfig): string {
    this._text = text;
    this._options = options;
    this._out = [];

    var t = new Tokenizer(config);
    var tokens = t.tokenize(text, 0, text.length, false).tokens;
    this._tokens = new TokenStream(tokens);

    var instructionIndent = this.getInstructionIndent();

    while (!this._tokens.isEndOfStream()) {
      this.appendNextToken();
    }

    var result = this._out.join("");
    return result;
  }

  private appendNextToken(): void {
    switch (this._tokens.currentToken.tokenType) {
      case TokenType.EndOfLine:
        this.appendLineBreak();
        break;
      case TokenType.LineComment:
        // Block comments are added verbatim
        this.appendLineComment();
        break;
      case TokenType.Comma:
        this.appendComma();
        break;
      default:
        this.appendToken(this._tokens.currentToken);
        break;
    }
  }

  private appendLineBreak(): void {
    this._out.push("\n");
    this._tokens.moveToNextToken();
  }

  private appendLineComment(): void {
    // Line comments when nothing else at the line get aligned 
    // to either 0 or to instructions indent, whichever is closer.
    var pt = this._tokens.previousToken;
    if (pt.tokenType === TokenType.EndOfLine || pt.tokenType === TokenType.EndOfStream) {

    }
  }

  private appendComma(): void {
    if (this._options.spaceAfterComma) {
      this._out.push(", ");
    } else {
      this._out.push(" ");
    }
  }

  private appendToken(t: Token): void {
    // If it is first token which is not a label, or a second token that is
    // preceded by a label and it is a symbol, it is the instruction name.
    this._out.push(this._text.getText(t.start, t.length));
  }

  private getInstructionIndent(): number {
    var maxLength = 0;
    for (var i = 0; i < this._tokens.length; i++) {
      var t = this._tokens.currentToken;
      if (t.length > maxLength && t.tokenType === TokenType.Label) {
        maxLength = t.length;
      }
      this._tokens.moveToNextToken();
    }
    this._tokens.position = 0;
    return Math.floor((maxLength + this._options.tabSize - 1) / this._options.tabSize);
  }
}
