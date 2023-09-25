// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { AssemblerConfig } from '../core/syntaxConfig';
import { Character } from '../text/charCodes';
import { TextProvider } from '../text/text';
import { TokenStream } from '../tokens/tokenStream';
import { Tokenizer } from '../tokens/tokenizer';
import { Token, TokenSubType, TokenType } from '../tokens/tokens';

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
  public alignOperands: boolean;
  public ignoreComments: boolean;
  public spaceAroundOperators: boolean;
  public alignDirectivesToInstructions: boolean;
}

export class Formatter {
  private _tokens: TokenStream;
  private _text: TextProvider;
  private _options: FormatOptions;
  private _instructionIndent: number;
  private _operandsIndent: number;
  private _lines: string[] = [];
  private _lineText: string[] = [];

  public formatDocument(text: TextProvider, options: FormatOptions, config: AssemblerConfig): string {
    this._text = text;
    this._options = options;
    this._lines = [];

    const t = new Tokenizer(config);
    const tokens = t.tokenize(text, 0, text.length);
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

    const result = this._lines.join('\n');
    return result;
  }

  private formatLine(tokens: Token[]): string {
    // There is at least one token
    if (tokens.length === 0) {
      return '';
    }

    this._lineText = [];
    // We trust tokenizer so we are not going to check here
    // if there is more than one label or instruction.
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      switch (t.type) {
        case TokenType.Label:
          this._lineText.push(this._text.getText(t.start, t.length));
          break;

        case TokenType.Directive:
          this.appendInstructionOrDirective(tokens, i);
          break;

        case TokenType.Operator:
          this.appendOperator(t);
          break;

        case TokenType.OpenBrace:
        case TokenType.CloseBrace:
        case TokenType.OpenBracket:
        case TokenType.CloseBracket:
        case TokenType.OpenCurly:
        case TokenType.CloseCurly:
        case TokenType.Number:
        case TokenType.String:
        case TokenType.Unknown:
          this.appendOperand(tokens, i);
          break;

        case TokenType.LineComment:
          // Block comments are added verbatim
          this.appendLineComment(tokens, i);
          break;

        case TokenType.Comma:
          this.appendComma();
          break;

        default:
          this.appendWhitespace();
          this._lineText.push(this._text.getText(t.start, t.length));
          break;
      }
    }

    const result = this._lineText.join('');
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

  private appendInstructionOrDirective(tokens: Token[], i: number): void {
    // label:<tab>instruction ...
    // <tab>      instruction
    // label:<tab>.directive
    // .directive
    const pt = i > 0 ? tokens[i - 1] : new Token(TokenType.EndOfLine, 0, 0);
    const ct = tokens[i];

    switch (pt.type) {
      case TokenType.EndOfLine:
      case TokenType.EndOfStream:
        // Indent instruction, leave directive as is
        if (ct.type === TokenType.Symbol) {
          this._lineText.push(this.getWhitespace(this._instructionIndent));
        }
        break;

      case TokenType.Label:
        this._lineText.push(this.getWhitespace(this._instructionIndent - pt.length));
        break;

      default:
        this._lineText.push(this.getWhitespace(1));
        break;
    }
    let text = this._text.getText(ct.start, ct.length);
    if (ct.type === TokenType.Symbol && ct.subType === TokenSubType.Instruction) {
      text = this._options.uppercaseInstructions ? text.toUpperCase() : text.toLowerCase();
    } else {
      text = this._options.uppercaseDirectives ? text.toUpperCase() : text.toLowerCase();
    }
    this._lineText.push(text);
  }

  private appendOperand(tokens: Token[], i: number) {
    const pt = i > 0 ? tokens[i - 1] : new Token(TokenType.EndOfLine, 0, 0);
    const ct = tokens[i];

    switch (pt.type) {
      case TokenType.Symbol:
      case TokenType.Directive:
        // Indent instruction, leave directive as is
        if (this._options.alignOperands) {
          this._lineText.push(this.getWhitespace(this._operandsIndent - this._instructionIndent - pt.length));
        } else {
          this._lineText.push(this.getWhitespace(1));
        }
        this._lineText.push(this._text.getText(ct.start, ct.length));
        break;

      case TokenType.Comma:
        this._lineText.push(this._text.getText(ct.start, ct.length));
        break;

      default:
        this.appendWhitespace();
        this._lineText.push(this._text.getText(ct.start, ct.length));
        break;
    }
  }

  private appendLineComment(tokens: Token[], i: number): void {
    // Line comments when nothing else at the line get aligned
    // to either 0 or to instructions indent, whichever is closer.
    const pt = i > 0 ? tokens[i - 1] : new Token(TokenType.EndOfLine, 0, 0);
    const ct = tokens[i];

    if (Token.isEndOfLine(pt)) {
      // Get current indentation
      const currentIndentation = ct.start - pt.end;
      if (currentIndentation > this._instructionIndent / 2) {
        // indent to instructions
        this._lineText.push(this.getWhitespace(this._instructionIndent));
      }
    } else if (pt.type === TokenType.Label) {
      this._lineText.push(this.getWhitespace(this._instructionIndent - pt.length));
    } else {
      this._lineText.push(this.getWhitespace(1));
    }
    this._lineText.push(this._text.getText(ct.start, ct.length));
  }

  private appendComma(): void {
    if (this._options.spaceAfterComma) {
      this._lineText.push(', ');
    } else {
      this._lineText.push(',');
    }
  }

  private appendOperator(t: Token): void {
    if (this._options.spaceAroundOperators) {
      this.appendWhitespace();
    }
    this._lineText.push(this._text.getText(t.start, t.length));
    if (this._options.spaceAroundOperators) {
      this._lineText.push(' ');
    }
  }

  private appendWhitespace(): void {
    // Don't add whitespace if it is already there.
    if (this._lineText.length > 0) {
      const lastChunk = this._lineText[this._lineText.length - 1];
      const lastChar = lastChunk.charCodeAt(lastChunk.length - 1);
      if (Character.isWhitespace(lastChar)) {
        return;
      }
    }
    // Do not add whitespace after opening or closing braces.
    switch (this._tokens.previousToken.type) {
      case TokenType.OpenBrace:
      case TokenType.CloseBrace:
      case TokenType.OpenBracket:
      case TokenType.CloseBracket:
      case TokenType.OpenCurly:
      case TokenType.CloseCurly:
        return;
    }
    this._lineText.push(' ');
  }

  private getWhitespace(amount: number): string {
    return new Array(amount + 1).join(' ');
  }

  private getIndents(): { instructions: number; operands: number } {
    const currentPosition = this._tokens.position;
    let maxLabelLength = 0;
    let maxInstructionLength = 0;

    for (let i = 0; i < this._tokens.length; i++) {
      const ct = this._tokens.currentToken;
      // Only measure labels that are on the same line as instructions/directives
      switch (ct.type) {
        case TokenType.Label:
          if (ct.length > maxLabelLength) {
            maxLabelLength = ct.length;
          }
          break;
        case TokenType.Directive:
        case TokenType.Symbol:
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
    // Instruction indent is label length + 1 rounded up to the nearest tab multiple.
    const instructionsIndent = Math.ceil((maxLabelLength + 1) / ts) * ts;
    let operandsIndent = instructionsIndent;
    if (maxInstructionLength > 0) {
      // no instructions found
      operandsIndent = instructionsIndent + maxInstructionLength;
      // Operands indent is instruction indent + max instruction + 1
      // rounded up to the nearest tab multiple
      operandsIndent = Math.ceil((instructionsIndent + maxInstructionLength + 1) / ts) * ts;
    }

    return {
      instructions: instructionsIndent,
      operands: operandsIndent,
    };
  }
}
