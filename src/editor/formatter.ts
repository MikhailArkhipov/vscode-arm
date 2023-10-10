// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { AstRootImpl } from '../AST/astRoot';
import { AstRoot } from '../AST/definitions';
import { Char, Character } from '../text/charCodes';
import { TextProvider } from '../text/definitions';
import { TextStream } from '../text/textStream';
import { makeWhitespace } from '../text/utility';
import { Token, TokenType, TokenSubType, A64Set } from '../tokens/definitions';
import { Directive } from '../tokens/directive';
import { TokenStream } from '../tokens/tokenStream';
import { Tokenizer } from '../tokens/tokenizer';
import { CommentGroup, detectCommentAlignment, detectIndentation, detectInstructionSet } from './detectors';
import { FormatOptions } from './options';

// - Align instructions in a column, number to tabs is based on
// the longest label. Ex label: yields 2 tabs of size 4.
// - Align instructions in a fixed column. If label is too long,
// it is placed in a separate line.
// - Directives can be aligned at position 0 or indented
// with instructions.
// - Multiple empty lines are reduced to a single empty line.
// - Line comments are either aligned to 0 or to instructions whichever is closer.
// - End of line comments alignment is preserved as is.

export class Formatter {
  private _tokens: TokenStream;
  private _text: TextProvider;
  private _options: FormatOptions;

  private _instructionIndent: number;
  private _operandsIndent: number;
  private _dataDirectivesIndent: number;
  private _dataDirectivesOperandIndent: number;
  private _commentGroups: readonly CommentGroup[];

  private _lines: string[] = [];
  private _lineParts: string[] = [];
  private _lineNumber = 0;
  private _lineStart = 0;

  public formatDocument(text: string, options: FormatOptions, instructionSet?: string): string {
    // NOTE: the code does not deal with tabs. Recalculating indents from tabs to spaces
    // during formatting with possible combinations of tabs and spaces is too much trouble.
    // For simplicity all tabs are converted to spaces.
    if (text.indexOf('\t') >= 0) {
      text = convertTabsToSpaces(text);
    }
    const ast = createAst(text, instructionSet);
    const tokens = ast.tokens.asArray();

    this._text = new TextStream(text);
    this._tokens = new TokenStream(tokens);
    this._options = options;

    this._lines = [];
    this._tokens.position = 0;
    this._commentGroups = detectCommentAlignment(tokens);

    const indents = detectIndentation(text, tokens, options);
    this._instructionIndent = indents.instructionsIndent;
    this._operandsIndent = indents.operandsIndent;
    this._dataDirectivesIndent = indents.dataDirectivesIndent;
    this._dataDirectivesOperandIndent = indents.dataDirectivesOperandIndent;

    // Format line by line.
    while (!this._tokens.isEndOfStream()) {
      const ct = this._tokens.currentToken;
      // Handle empty line
      if (ct.type === TokenType.EndOfLine) {
        this.appendEmptyLine();
        this._lineNumber++;
        this._lineStart = ct.end;
        continue;
      }

      if (this.tryPreprocessorLine()) {
        continue;
      }
      // If options call for label on a separate line, add line break here
      // and then proceed with formatting like there was no label. This does
      // not apply to data declaration labels that remain on the same line.
      if (ct.type === TokenType.Label && this.appendSeparateLineLabel()) {
        continue;
      }
      this.formatLine();
    }

    let result = this._lines.join('\n');
    // Make sure there is a line break at the end.
    if (result.length > 0 && !Character.isNewLine(result.charCodeAt(result.length - 1))) {
      result = result + '\n';
    }
    return result;
  }

  private formatLine(): void {
    // Determine line structure
    const ct = this._tokens.currentToken;
    const labelToken = ct.type === TokenType.Label ? ct : undefined;
    const mainToken = labelToken ? this._tokens.nextToken : ct;

    // Don't check subtype on instruction here since token might be an unknown
    // instruction or a macro call and we still want to indent it properly.
    switch (mainToken.type) {
      case TokenType.Directive:
        this.appendDirective(labelToken, mainToken);
        break;
      case TokenType.Symbol:
        this.appendInstruction(labelToken, mainToken);
        break;
    }

    this.appendOperands(mainToken);
    this.completeCurrentLine();
  }

  private appendSeparateLineLabel(): boolean {
    // If label is already on its own line, do nothing.
    // If options call for label on a separate line, add line break here
    // and then proceed with formatting like there was no label. This does
    // not apply to data declaration labels that remain on the same line.
    const nt = this._tokens.nextToken;
    let separateLine = this._options.labelsOnSeparateLines;
    if (nt.type === TokenType.Directive) {
      const directiveText = this._text.getText(nt.start, nt.length);
      separateLine = separateLine && !Directive.isDeclaration(directiveText);
    }
    // We deal with labels on the same line in the main formatting function
    // since both instruction and directives must calculate indentation
    // based on the label length.
    if (!separateLine) {
      return false;
    }

    const ct = this._tokens.currentToken;
    this.appendToken(ct, this._options.uppercaseLabels);
    // There may be line comment which we want to keep on the same line.
    if (nt.type === TokenType.LineComment) {
      this.appendLineComment();
    }
    this.completeCurrentLine();
    return true;
  }

  private appendDirective(labelToken: Token | undefined, directiveToken: Token): void {
    // label:<tab>.directive
    // .directive
    const directiveText = this._text.getText(directiveToken.start, directiveToken.length);
    if (Directive.isDefinition(directiveText) || Directive.isDeclaration(directiveText)) {
      // No line breaks on 'label: .word 1'
      if (labelToken) {
        this.appendToken(labelToken, this._options.uppercaseLabels);
        this._lineParts.push(makeWhitespace(this._dataDirectivesIndent - labelToken.length));
      } else {
        this._lineParts.push(makeWhitespace(this._dataDirectivesIndent));
      }
      this.appendToken(directiveToken, this._options.uppercaseDirectives);
      return;
    }
    // Regular directive: on its own line.
    if (labelToken) {
      this.appendToken(labelToken, this._options.uppercaseLabels);
      this.completeCurrentLine();
    }
    this.appendToken(directiveToken, this._options.uppercaseDirectives);
  }

  private appendInstruction(labelToken: Token | undefined, instructionToken: Token): void {
    // label:<tab>instruction ...
    // <tab>      instruction
    if (labelToken) {
      this.appendToken(labelToken, this._options.uppercaseLabels);
      if (this._options.labelsOnSeparateLines) {
        this.completeCurrentLine();
        this._lineParts.push(makeWhitespace(this._instructionIndent));
      } else {
        this._lineParts.push(makeWhitespace(this._instructionIndent - labelToken.length));
      }
    } else {
      const text = this._text.getText(instructionToken.start, instructionToken.length);
      const pt = this._tokens.previousToken;
      this._lineParts.push(makeWhitespace(this._instructionIndent));
    }
    this.appendToken(
      instructionToken,
      instructionToken.subType === TokenSubType.Instruction ? this._options.uppercaseInstructions : undefined
    );
  }

  private appendOperands(mainToken: Token) {
    // Add appropriate indent for operands. We align data and definition directive operands but not others.
    // I.e. in 'label: .word 177' the '177' is aligned, while '4' in '.align 4' is just separated by space.
    let alignOperands = this._options.alignOperands && this._lineParts.length > 0;
    if (mainToken.type === TokenType.Directive) {
      const mainTokenText = this._text.getText(mainToken.start, mainToken.length);
      if (!Directive.isDeclaration(mainTokenText)) {
        alignOperands = false;
      }
    }

    if (alignOperands) {
      const lineTextSoFar = this._lineParts.join('');
      const indent = mainToken.type === TokenType.Directive ? this._dataDirectivesOperandIndent : this._operandsIndent;
      const ws = Math.max(indent - lineTextSoFar.length, 1);
      this._lineParts.push(makeWhitespace(ws));
    } else {
      this.appendWhitespace();
    }

    this.appendOperandTokens();
    if (!this._tokens.isEndOfLine()) {
      throw new Error('Formatter: must be at EOL.');
    }
  }

  private appendOperandTokens(): void {
    // Append everything till EOL
    while (!this._tokens.isEndOfLine()) {
      const ct = this._tokens.currentToken;
      switch (ct.type) {
        case TokenType.Operator:
          this.appendOperator();
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
          this.appendToken(ct);
          break;

        case TokenType.LineComment:
          this.appendLineComment();
          break;

        case TokenType.BlockComment:
          this.appendBlockComment();
          break;

        case TokenType.Comma:
          this.appendComma();
          break;

        case TokenType.Symbol:
          this.appendSymbol();
          break;

        default:
          this.appendUnknown();
          break;
      }
    }
  }

  private appendSymbol() {
    const ct = this._tokens.currentToken;
    const casing = ct.subType === TokenSubType.Register ? this._options.uppercaseRegisters : undefined;
    // We only add a space if there was a space.
    // Otherwise we may end up separating R1 from = in '=R1'.
    if (this._tokens.previousToken.end < ct.start) {
      this.appendWhitespace();
    }
    this.appendToken(ct, casing);
  }

  private appendLineComment() {
    // Find out which group the comment belongs to
    if (this._lineParts.length === 0) {
      // Only align standalone comments
      this.appendStandaloneLineComment();
    } else {
      if (this._options.alignEolComments) {
        this.appendEndOfLineComment();
      } else {
        // When comment trailers operands, simply add a space.
        this.appendWhitespace();
        this.appendToken(this._tokens.currentToken);
      }
    }
  }

  private appendStandaloneLineComment(): void {
    let ws: number;
    if (this._tokens.previousToken.type === TokenType.Label) {
      // After labels indent comment to instructions. However, with long labels
      // _instructionIndent may become smaller than the label length, as in
      // label:
      //     mov, r1, ...
      // So we just add a single space then.
      ws = Math.max(1, this._instructionIndent - this._tokens.previousToken.length);
    } else {
      // Line comments when nothing else at the line get aligned
      // to either 0 or to instructions indent.
      if (this._tokens.currentToken.type === TokenType.LineComment) {
        const group = this.findCommentGroup(this._tokens.position, true);
        ws = group.averageIndent <= 2 ? 0 : this._instructionIndent;
      } else {
        // This code can be called with single-line block comment.
        const currentIndent = this._tokens.currentToken.start - this._lineStart;
        ws = currentIndent <= 2 ? 0 : this._instructionIndent;
      }
    }
    this._lineParts.push(makeWhitespace(ws));
    this.appendToken(this._tokens.currentToken);
  }

  private appendEndOfLineComment(): void {
    const group = this.findCommentGroup(this._tokens.position, false);
    // Group of one is aligned 1 space after the line content.
    if (group.indices.length === 1) {
      this.appendWhitespace();
      this.appendToken(this._tokens.currentToken);
      return;
    }

    let formattedLengthBeforeComment = 0;
    this._lineParts.forEach((p) => (formattedLengthBeforeComment += p.length));

    const mostCommonIndent = group.getMostCommonIndent();
    const ws = Math.max(1, mostCommonIndent - formattedLengthBeforeComment);

    this._lineParts.push(makeWhitespace(ws));
    this.appendToken(this._tokens.currentToken);
  }

  private appendBlockComment(): void {
    // Single-line block comments are treated the same as // so
    // '/* comment */' is aligned the same as '// comment'.
    // Multiline block comments have their leading ws preserved.
    const ct = this._tokens.currentToken;
    const commentText = this._text.getText(ct.start, ct.length);
    // Any line breaks in it?
    const multiline = commentText.indexOf('\n') > 0;
    if (multiline) {
      this.appendMultilineComment();
    } else {
      this.appendLineComment();
    }
  }

  private appendMultilineComment(): void {
    const ct = this._tokens.currentToken;
    const pt = this._tokens.previousToken;

    const originalIndent = ct.start - pt.end;
    const commentText = this._text.getText(ct.start - originalIndent, ct.length + originalIndent);
    const commentLines = commentText.split('\n').filter((l) => (l === '\r' ? '' : l));

    // We do not align individual lines. Block is block. But we do try and
    // preserve indent of subsequent lines relatively to the first. Consider header:
    //
    //    /******************
    //     * Description
    //     *****************/
    //     mov r1, ...
    //
    // If alignment detector determines that comment block is aligned with instruction
    // and the instruction moves by, say, 2 spaces, we move the block by the same amount so
    // the block remains aligned relatively to the code same way it was aligned before.

    // If original indent is zero
    let shift = 0;
    if (originalIndent > 1) {
    }
    // Is comment appear to be aligned with the next instruction?
    // Look ahead, skipping comment token, line break and optionally label.
    const wsBeforeCommentBlock = ct.start - this._lineStart;
    let t: Token;
    let offset = 1;
    let alignedWithInstruction = false;
    let originalInstructionIndent = 0;
    let lineStart = 0;
    do {
      t = this._tokens.lookAhead(offset);
      if (t.type === TokenType.EndOfLine) {
        lineStart = t.end;
      } else if (t.type === TokenType.Symbol) {
        originalInstructionIndent = t.start - lineStart;
        if (Math.abs(originalInstructionIndent - wsBeforeCommentBlock) < 2) {
          alignedWithInstruction = true;
          break;
        }
      }
      offset++;
    } while (t.type === TokenType.EndOfLine || t.type === TokenType.Label);

    if (alignedWithInstruction) {
      shift = this._instructionIndent - originalInstructionIndent;
    }
    commentLines.forEach((line) => {
      const originalLineIndent = line.length - line.trimStart().length;
      const ws = originalLineIndent + shift > 0 ? originalLineIndent + shift : 0;
      this._lineParts.push(makeWhitespace(ws));
      this._lineParts.push(line.trim());
      this.completeCurrentLine();
    });

    this._tokens.moveToNextToken();
  }

  private appendComma(): void {
    if (this._options.spaceAfterComma) {
      this._lineParts.push(', ');
    } else {
      this._lineParts.push(',');
    }
    this._tokens.moveToNextToken();
  }

  private appendOperator(): void {
    const unary = this.isAtUnaryOperator();
    if (this._options.spaceAroundOperators && !unary) {
      this.appendWhitespace();
    }
    this.appendToken(this._tokens.currentToken);
    if (this._options.spaceAroundOperators && !unary) {
      this.appendWhitespace();
    }
  }

  // = operator requires special handling. The reason is that it comes in two forms.
  // First one in instructions, like =[R1] - basically an unary operator.
  // Second is in directives, as in 'sym = .+4' which is the same as .set.
  private isAtUnaryOperator(): boolean {
    const ct = this._tokens.currentToken;
    const opText = this._text.getText(ct.start, ct.length);
    if (opText !== '=') {
      return false;
    }

    const pt = this._tokens.previousToken;
    const nt = this._tokens.nextToken;
    return (
      pt.type === TokenType.Comma ||
      pt.subType === TokenSubType.Instruction ||
      nt.type === TokenType.OpenBracket ||
      nt.type === TokenType.OpenCurly ||
      nt.type === TokenType.OpenBrace ||
      (nt.type === TokenType.Symbol && nt.subType === TokenSubType.Register)
    );
  }

  private appendUnknown(): void {
    // if 'unknown' had space before or after, keep one space.
    const ct = this._tokens.currentToken;
    if (ct.start > 0 && this._text.charCodeAt(ct.start - 1) === Char.Space) {
      this.appendWhitespace();
    }
    this.appendToken(ct);
  }

  private appendWhitespace(): void {
    // Don't add at start of the line
    if (this._lineParts.length === 0) {
      return;
    }
    // Don't add whitespace if it is already there.
    const lastChunk = this._lineParts[this._lineParts.length - 1];
    const lastChar = lastChunk.charCodeAt(lastChunk.length - 1);
    if (Character.isWhitespace(lastChar)) {
      return;
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
    this._lineParts.push(' ');
  }

  private completeCurrentLine(force = false): void {
    if (force || this._lineParts.length > 0) {
      // Finish current line. Note this completes the resulting line
      // while current token in the stream may not be EOL just yet.
      // Consider that this is invoked when adding line break
      // after a label, if options call for labels on separate lines.
      const lineText = this._lineParts.join('').trimEnd();
      this._lines.push(lineText);
    }
    // Handle EOL token.
    if (this._tokens.currentToken.type === TokenType.EndOfLine) {
      this._lineStart = this._tokens.currentToken.end;
      this._tokens.moveToNextToken();
    }
    this._lineParts = [];
  }

  private appendEmptyLine(): void {
    if (this._lines.length > 0 && this._lineParts.length === 0) {
      // Make sure we are not adding yet another empty line.
      const prevLineLength = this._lines[this._lines.length - 1].length;
      if (prevLineLength === 0) {
        this._tokens.moveToNextToken();
        return;
      }
    }
    this.completeCurrentLine(true);
  }

  private tryPreprocessorLine(): boolean {
    const pt = this._tokens.previousToken;
    if (pt.type === TokenType.EndOfLine || pt.type === TokenType.EndOfStream) {
      const firstToken = this._tokens.currentToken;

      const text = this._text.getText(firstToken.start, firstToken.length);
      if (text.startsWith('#')) {
        // Leave C preprocessor alone.
        this._tokens.moveToEol();
        this._lines.push(this._text.getText(firstToken.start, this._tokens.previousToken.end - firstToken.start));
        this._lineStart = this._tokens.currentToken.end;
        this._lineNumber++;
        this._tokens.moveToNextToken();
        return true;
      }
    }
    return false;
  }

  private appendToken(t: Token, uppercase?: boolean): void {
    let text = this._text.getText(t.start, t.length);
    if (uppercase !== undefined) {
      text = uppercase === true ? text.toUpperCase() : text.toLowerCase();
    }
    this._lineParts.push(text);
    this._tokens.moveToNextToken();
  }

  private findCommentGroup(index: number, standalone: boolean): CommentGroup {
    const group = this._commentGroups.find((cg) => cg.firstIndex <= index && cg.lastIndex >= index);
    if (!group) {
      throw new Error('Unable to find comment group.');
    }
    if (group.standalone !== standalone) {
      throw new Error('Found comment group but it is different type.');
    }
    return group;
  }
}

function createAst(documentText: string, instructionSet?: string): AstRoot {
  const initialSet = instructionSet ?? A64Set;
  let t = new Tokenizer(initialSet);
  let tokens = t.tokenize(new TextStream(documentText));
  const detectedInstructionSet = detectInstructionSet(documentText, tokens);

  if (!instructionSet && detectedInstructionSet !== initialSet) {
    instructionSet = detectedInstructionSet;
    t = new Tokenizer(instructionSet);
    tokens = t.tokenize(new TextStream(documentText));
  } else {
    instructionSet = initialSet;
  }
  return AstRootImpl.create(documentText, instructionSet, tokens, 0);
}

function convertTabsToSpaces(text: string): string {
  // Go line by line. Assume tab is 8.
  const linesIn = text.split('\n').map((t) => (t === '\r' ? '' : t));
  const linesOut: string[] = [];
  const tabSize = 8;

  linesIn.forEach((l) => {
    const chars: string[] = [];
    let lengthSoFar = 0;

    for (let i = 0; i < l.length; i++) {
      const ch = l.charAt(i);
      if (ch === '\t') {
        // Advance to the next tab position.
        const nextTab = (Math.floor(lengthSoFar / tabSize) + 1) * tabSize;
        const ws = nextTab - lengthSoFar;
        chars.push(makeWhitespace(ws));
        lengthSoFar = nextTab;
      } else {
        lengthSoFar++;
        chars.push(ch);
      }
    }

    linesOut.push(chars.join(''));
  });

  return linesOut.join('\n');
}
