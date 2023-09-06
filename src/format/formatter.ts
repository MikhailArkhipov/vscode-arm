// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { AssemblerConfig } from "../syntaxConfig";
import { Character } from "../text/charCodes";
import { TextProvider } from "../text/text";
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
  private _text: TextProvider;
  private _options: FormatOptions;
  private _instructionIndent: number;
  private _operandsIndent: number;
  private _lines: string[] = [];

  public formatDocument(
    text: TextProvider,
    options: FormatOptions,
    config: AssemblerConfig
  ): string {
    this._text = text;
    this._options = options;
    this._lines = [];

    const t = new Tokenizer(config);
    const tokens = t.tokenize(text, 0, text.length, false).tokens;
    this._tokens = new TokenStream(tokens);

    const indents = this.getIndents();
    this._instructionIndent = indents.instructions;
    this._operandsIndent = indents.operands;

    // Format line by line.
    while (!this._tokens.isEndOfStream()) {
      // Collect tokens up to EOL or EOF
      const lineTokens = this.getLineTokens();

      const lineText = this.formatLine(lineTokens);
      if (lineText.length > 0) {
        this._lines.push(lineText);
      }

      if (this._tokens.isEndOfLine()) {
        this._tokens.moveToNextToken();
      }
    }

    const result = this._lines.join("\n");
    return result;
  }

  private formatLine(tokens: Token[]): string {
    // There is at least one token
    if (tokens.length === 0) {
      return "";
    }

    const lineText: string[] = [];
    // We trust tokenizer so we are not going to check here
    // if there is more than one label or instruction.
    for (var i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      switch (t.tokenType) {
        case TokenType.Label:
          lineText.push(this._text.getText(t.start, t.length));
          break;

        case TokenType.Instruction:
        case TokenType.Directive:
          this.appendInstructionOrDirective(tokens, i, lineText);
          break;

        case TokenType.Sequence:
          this.appendOperand(tokens, i, lineText);
          break;

        case TokenType.LineComment:
          // Block comments are added verbatim
          this.appendLineComment(tokens, i, lineText);
          break;

        case TokenType.Comma:
          this.appendComma(lineText);
          break;

        default:
          lineText.push(this.getWhitespace(1));
          lineText.push(this._text.getText(t.start, t.length));
          break;
      }
    }

    const result = lineText.join("");
    return result;
  }

  private getLineTokens(): Token[] {
    const lineTokens: Token[] = [];
    while (!this._tokens.isEndOfLine()) {
      lineTokens.push(this._tokens.currentToken);
      this._tokens.moveToNextToken();
    }
    return lineTokens;
  }

  private appendInstructionOrDirective(
    tokens: Token[],
    i: number,
    lineText: string[]
  ) {
    // label:<tab>instruction ...
    // <tab>      instruction
    // label:<tab>.directive
    // .directive
    const pt = i > 0 ? tokens[i - 1] : new Token(TokenType.EndOfLine, 0, 0);
    const ct = tokens[i];

    switch (pt.tokenType) {
      case TokenType.EndOfLine:
      case TokenType.EndOfStream:
        // Indent instruction, leave directive as is
        if (ct.tokenType === TokenType.Instruction) {
          lineText.push(this.getWhitespace(this._instructionIndent));
        }
        break;

      case TokenType.Label:
        lineText.push(this.getWhitespace(this._instructionIndent - pt.length));
        break;

      default:
        lineText.push(this.getWhitespace(1));
        break;
    }
    lineText.push(this._text.getText(ct.start, ct.length));
  }

  private appendOperand(tokens: Token[], i: number, lineText: string[]) {
    const pt = i > 0 ? tokens[i - 1] : new Token(TokenType.EndOfLine, 0, 0);
    const ct = tokens[i];

    switch (pt.tokenType) {
      case TokenType.Instruction:
      case TokenType.Directive:
        // Indent instruction, leave directive as is
        lineText.push(
          this.getWhitespace(
            this._operandsIndent - this._instructionIndent - pt.length
          )
        );
        lineText.push(this._text.getText(ct.start, ct.length));
        break;

      case TokenType.Comma:
        lineText.push(this._text.getText(ct.start, ct.length));
        break;

      default:
        lineText.push(this.getWhitespace(1));
        lineText.push(this._text.getText(ct.start, ct.length));
        break;
    }
  }

  private appendLineComment(
    tokens: Token[],
    i: number,
    lineText: string[]
  ): void {
    // Line comments when nothing else at the line get aligned
    // to either 0 or to instructions indent, whichever is closer.
    const pt = i > 0 ? tokens[i - 1] : new Token(TokenType.EndOfLine, 0, 0);
    const ct = tokens[i];

    if (Token.isEndOfLine(pt)) {
      // Get current indentation
      const currentIndentation = ct.start - pt.end;
      if (currentIndentation > this._instructionIndent / 2) {
        // indent to instructions
        lineText.push(this.getWhitespace(this._instructionIndent));
      }
    } else if (pt.tokenType === TokenType.Label) {
      lineText.push(this.getWhitespace(this._instructionIndent - pt.length));
    } else {
      lineText.push(this.getWhitespace(1));
    }
    lineText.push(this._text.getText(ct.start, ct.length));
  }

  private appendComma(lineText: string[]): void {
    if (this._options.spaceAfterComma) {
      lineText.push(", ");
    } else {
      lineText.push(" ");
    }
  }

  private getWhitespace(amount: number): string {
    return new Array(amount + 1).join(" ");
  }

  private getIndents(): { instructions: number; operands: number } {
    const currentPosition = this._tokens.position;
    var maxLabelLength = 0;
    var maxInstructionLength = 0;

    for (var i = 0; i < this._tokens.length; i++) {
      const ct = this._tokens.currentToken;
      // Only measure labels that are on the same like as instructions/directives
      switch (ct.tokenType) {
        case TokenType.Label:
          if (ct.length > maxLabelLength) {
            maxLabelLength = ct.length;
          }
          break;
        case TokenType.Directive:
        case TokenType.Instruction:
          if (ct.length > maxInstructionLength) {
            maxInstructionLength = ct.length;
          }
          break;
      }
      this._tokens.moveToNextToken();
    }

    this._tokens.position = currentPosition;
    const ts = this._options.tabSize;
    // label:<tab>instruction<tab>//comment
    const instructionsIndent =
      (Math.floor((maxLabelLength + ts - 1) / ts) + 1) * ts;
    var operandsIndent = instructionsIndent;
    if (maxInstructionLength > 0) {
      // no instructions found
      operandsIndent = instructionsIndent + maxInstructionLength;
      operandsIndent = Math.floor((operandsIndent + ts - 1) / ts) * ts;
    }

    return {
      instructions: instructionsIndent,
      operands: operandsIndent,
    };
  }
}
