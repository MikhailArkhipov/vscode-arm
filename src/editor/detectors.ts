// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { findInstructionInfo } from '../instructions/instructionSet';
import { Char } from '../text/charCodes';
import { A32Set, A64Set, Token, TokenSubType, TokenType } from '../tokens/definitions';
import { Directive } from '../tokens/directive';
import { isRegisterName } from '../tokens/registers';
import { TokenStream } from '../tokens/tokenStream';
import { FormatOptions } from './options';

export const enum CasingType {
  Unknown = 0,
  Upper = 1,
  Lower = 2,
  Mixed = 3,
}

export interface CasingStyle {
  labels: CasingType;
  directives: CasingType;
  instructions: CasingType;
  registers: CasingType;
  others: CasingType;
}

export function detectInstructionSet(documentText: string, tokens: readonly Token[]): string {
  // Tokenize content and see what kind of registers are in use.
  const symbols = tokens.filter((t) => t.type === TokenType.Symbol).map((e) => documentText.substring(e.start, e.end));

  let score32 = symbols.filter((s) => isRegisterName(s, A32Set)).length;
  let score64 = symbols.filter((s) => isRegisterName(s, A64Set)).length;

  symbols.forEach((s) => {
    let info = findInstructionInfo(s, A32Set);
    if (info) {
      score32++;
    } else {
      let info = findInstructionInfo(s, A64Set);
      if (info) {
        score64++;
      }
    }
  });

  return score32 > score64 && score32 > 5 ? A32Set : A64Set;
}

export function detectCasingStyle(text: string, tokens: readonly Token[]): CasingStyle {
  let upperDirectives = 0;
  let lowerDirectives = 0;
  let upperInstructions = 0;
  let lowerInstructions = 0;
  let upperLabels = 0;
  let lowerLabels = 0;
  let upperRegisters = 0;
  let lowerRegisters = 0;
  let upperOthers = 0;
  let lowerOthers = 0;

  tokens.forEach((t) => {
    const tokenText = text.substring(t.start, t.end);
    const casing = detectCasingType(tokenText);
    switch (t.type) {
      case TokenType.Symbol:
        switch (t.subType) {
          case TokenSubType.Register:
            upperRegisters = casing === CasingType.Upper ? upperRegisters + 1 : upperRegisters;
            lowerRegisters = casing === CasingType.Lower ? lowerRegisters + 1 : lowerRegisters;
            break;

          case TokenSubType.Instruction:
            upperInstructions = casing === CasingType.Upper ? upperInstructions + 1 : upperInstructions;
            lowerInstructions = casing === CasingType.Lower ? lowerInstructions + 1 : lowerInstructions;
            break;

          default:
            upperOthers = casing === CasingType.Upper ? upperOthers + 1 : upperOthers;
            lowerOthers = casing === CasingType.Lower ? lowerOthers + 1 : lowerOthers;
            break;
        }
        break;

      case TokenType.Label:
        upperLabels = casing === CasingType.Upper ? upperLabels + 1 : upperLabels;
        lowerLabels = casing === CasingType.Lower ? lowerLabels + 1 : lowerLabels;
        break;

      case TokenType.Directive:
        upperDirectives = casing === CasingType.Upper ? upperDirectives + 1 : upperDirectives;
        lowerDirectives = casing === CasingType.Lower ? lowerDirectives + 1 : lowerDirectives;
        break;
    }
  });

  return {
    labels: getCasingType(upperLabels, lowerLabels),
    directives: getCasingType(upperDirectives, lowerDirectives),
    instructions: getCasingType(upperInstructions, lowerInstructions),
    registers: getCasingType(upperRegisters, lowerRegisters),
    others: getCasingType(upperOthers, lowerOthers),
  };
}

function detectCasingType(text: string): CasingType {
  let upper = 0;
  let lower = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    if (Char.A <= ch && ch <= Char.Z) {
      upper++;
    }
    if (Char.a <= ch && ch <= Char.z) {
      lower++;
    }
  }
  return getCasingType(upper, lower);
}

function getCasingType(upper: number, lower: number): CasingType {
  if (upper === 0 && lower === 0) {
    return CasingType.Unknown;
  }
  if (upper > lower) {
    return CasingType.Upper;
  }
  return lower > upper ? CasingType.Lower : CasingType.Mixed;
}

export interface DetectedIndentation {
  instructionsIndent: number;
  operandsIndent: number;
  dataDirectivesIndent: number;
  dataDirectivesOperandIndent: number;
}

export function detectIndentation(text: string, tokens: readonly Token[], options: FormatOptions): DetectedIndentation {
  const ts = new TokenStream(tokens);
  let maxInstructionLabelLength = 0;
  let maxInstructionLength = 0;
  let maxDataDirectiveLabelLength = 0;
  let maxDataDirectiveLength = 0;

  while (!ts.isEndOfStream()) {
    // Only checking two first items in line
    let ct = ts.currentToken;
    // Only measure labels that are on the same line as instructions/directives
    if (ct.type === TokenType.Label) {
      // Statement has label
      const nt = ts.nextToken;

      switch (nt.type) {
        case TokenType.Directive:
          {
            // Is this 'label: .word'?
            const tokenText = text.substring(nt.start, nt.end);
            if (Directive.isDeclaration(tokenText)) {
              maxDataDirectiveLabelLength = Math.max(ct.length, maxDataDirectiveLabelLength);
              maxDataDirectiveLength = Math.max(nt.length, maxDataDirectiveLength);
            }
          }
          break;

        case TokenType.Symbol:
          maxInstructionLabelLength = Math.max(ct.length, maxInstructionLabelLength);
          break;
      }
      ts.moveToNextToken();
    }

    ct = ts.currentToken;
    if (ct.type === TokenType.Symbol) {
      const pt = ts.previousToken;
      // Don't count directive operand or a macro name as instruction.
      if (pt.type !== TokenType.Directive && ct.length > maxInstructionLength) {
        maxInstructionLength = ct.length;
      }
    }

    ts.moveToEol();
    ts.moveToNextToken();
  }

  const tabSize = options.tabSize;
  // label:<tab>instruction<tab>//comment
  // Instruction indent is label length + 1 rounded up to the nearest tab multiple.

  // Default, instructions at one tab.
  let instructionsIndent = options.tabSize;
  instructionsIndent = options.labelsOnSeparateLines
    ? options.tabSize
    : Math.ceil((maxInstructionLabelLength + 1) / tabSize) * tabSize;

  let operandsIndent = instructionsIndent;
  if (maxInstructionLength > 0) {
    operandsIndent = instructionsIndent + maxInstructionLength;
    // Operands indent is instruction indent + max instruction + 1
    // rounded up to the nearest tab multiple
    operandsIndent = Math.ceil((operandsIndent + 1) / tabSize) * tabSize;
  }

  if (!options.alignOperands) {
    operandsIndent = -1;
  }

  let dataDirectivesIndent = Math.ceil((maxDataDirectiveLabelLength + 1) / tabSize) * tabSize;
  let dataDirectivesOperandIndent = dataDirectivesIndent;
  if (maxDataDirectiveLength > 0) {
    dataDirectivesOperandIndent = dataDirectivesIndent + maxDataDirectiveLength;
    // Operands indent is instruction indent + max instruction + 1
    // rounded up to the nearest tab multiple
    dataDirectivesOperandIndent = Math.ceil((dataDirectivesOperandIndent + 1) / tabSize) * tabSize;
  }

  return {
    instructionsIndent,
    operandsIndent,
    dataDirectivesIndent,
    dataDirectivesOperandIndent,
  };
}

export function detectOperandAlignment(tokens: readonly Token[]): boolean {
  // If there is only a space between instruction
  // and its operands, the operands are not aligned.
  const ts = new TokenStream(tokens);
  let multiple = 0;
  let single = 0;
  while (!ts.isEndOfStream()) {
    const ct = ts.currentToken;
    const pt = ts.previousToken;
    const nt = ts.nextToken;
    if (
      ct.type === TokenType.Symbol &&
      (pt.type === TokenType.Label || pt.type === TokenType.EndOfLine) &&
      ts.nextToken.type !== TokenType.EndOfLine
    ) {
      if (ts.nextToken.start - ct.end > 1) {
        multiple++;
      } else {
        single++;
      }
      ts.moveToEol();
    } else {
      ts.moveToNextToken();
    }
  }
  return single < multiple;
}

export class CommentGroup {
  readonly standalone: boolean;

  private _averageIndent = -1;
  private _mostCommonIndent = -1;
  private _indices: number[] = [];
  private _indents: number[] = [];

  constructor(standalone: boolean) {
    this.standalone = standalone;
  }

  public get indices(): readonly number[] {
    return this._indices;
  }
  public get indents(): readonly number[] {
    return this._indents;
  }
  public get firstIndex(): number {
    return this._indices.length > 0 ? this._indices[0] : 0;
  }
  public get lastIndex(): number {
    return this._indices.length > 0 ? this._indices[this._indices.length - 1] : 0;
  }

  public get averageIndent(): number {
    if (this._averageIndent < 0) {
      this._averageIndent = 0;
      this.indents.forEach((e) => (this._averageIndent += e));
      this._averageIndent /= this.indents.length;
    }
    return Math.ceil(this._averageIndent);
  }

  public getMostCommonIndent(): number {
    if (this._mostCommonIndent >= 0) {
      return this._mostCommonIndent;
    }
    const map = new Map<number, number>();
    let max = 0;
    let maxIdent = 0;

    this.indents.forEach((e) => {
      let count = map.get(e);
      if (count) {
        count++;
        map.set(e, count);
        if (count > max) {
          max = count;
          maxIdent = e;
        }
      } else {
        map.set(e, 1);
      }
    });

    this._mostCommonIndent = maxIdent;
    return this._mostCommonIndent;
  }

  public addComment(index: number, indent: number): void {
    this._averageIndent = -1;
    this._indices.push(index);
    this._indents.push(indent);
  }
}

export function detectCommentAlignment(tokens: readonly Token[]): readonly CommentGroup[] {
  // Three types of EOL comments:
  // - Start at 0
  // - Aligned to instructions
  // - EOL comments that may be vertically aligned
  const groups: CommentGroup[] = [];
  let cg: CommentGroup | undefined;

  // Not filtering upfront since we need real indices.
  const ts = new TokenStream(tokens);
  let lastEol = 0;
  let lineNumber = 0;
  let lastCommentLineNumber = -1;

  while (!ts.isEndOfStream()) {
    // Count lines
    if (ts.currentToken.type === TokenType.EndOfLine) {
      lineNumber++;
      lastEol = ts.currentToken.end;
      ts.moveToNextToken();
      continue;
    }

    if (ts.currentToken.type !== TokenType.LineComment) {
      // If current cluster is standalone, complete it.
      if (cg && cg.standalone) {
        groups.push(cg);
        cg = undefined;
      }
      ts.moveToNextToken();
      continue;
    }

    // Comment belongs to the same cluster if
    //  - it is of the same kind (standalone or end-of-line)
    //  - preceding comment appears on a previous line.
    const currentIndent = ts.currentToken.start - lastEol;
    const standaloneComment =
      ts.previousToken.type === TokenType.EndOfLine || ts.previousToken.type === TokenType.EndOfStream;

    // Is type changing or indent is vastly different? If so, complete the cluster.
    if (
      !cg ||
      cg.standalone !== standaloneComment ||
      Math.abs(cg.averageIndent - currentIndent) >= 2 ||
      lineNumber - lastCommentLineNumber > 1
    ) {
      if (cg) {
        groups.push(cg);
      }
      cg = new CommentGroup(standaloneComment);
    }

    cg.addComment(ts.position, currentIndent);
    lastCommentLineNumber = lineNumber;
    ts.moveToNextToken();
  }

  if (cg) {
    groups.push(cg);
  }
  return groups;
}
