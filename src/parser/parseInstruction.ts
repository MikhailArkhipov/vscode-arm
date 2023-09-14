// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as asmInstuctions from '../arm-instructions.json';

import { TextRange, TextRangeImpl } from '../text/textRange';
import { ErrorLocation, ParseError, ParseErrorType } from './parseError';

export interface Instruction {
  readonly fullName: string; // LDMIANE.W
  readonly name: string; // 'LDM' - core name
    // 'S' as in ADD/ADDS or 'IA' - type, mode, effect: instruction specific
  readonly suffix: string;
  readonly condition: string; // NE/Z/...
  readonly width: string; // .W or .N
  readonly errors: ParseError[];

  readonly allowedWidths: readonly string[];
  readonly allowedSuffixes: readonly string[];
  readonly allowedTypes: readonly string[];
  readonly operandsFormats: readonly string[];
}

  export function parseInstruction(text: string, range: TextRange): Instruction {
    text = text.toUpperCase();
    const i = new InstructionImpl(text, range);
    i.parse(text);
    return i;
  }

class InstructionImpl implements Instruction {
  public readonly fullName: string; // LDMIANE.W
  public readonly range: TextRange;
  public readonly errors: ParseError[] = [];

  public name: string = ''; // 'LDM' - core name
  public suffix: string = ''; // 'S' as in ADD/ADDS, may be L, X, R, ... instruction specific
  // TT, TB - like suffix, but type is mandatory. Ex base name is SMLA with types BB, BT, ... yielding SMLABB, SMLABT, ...
  public type: string = '';
  public condition: string = ''; // NE/Z/...
  public width: string = ''; // .W or .N

  public allowedWidths: string[]; // Allowed modifiers like .W or .T
  public allowedSuffixes: readonly string[] = []; // Allowed suffixes, like CPS/CPSIE/CPSID
  public allowedTypes: string[] = []; // Allowed mandatory types, like SMLALxy
  public operandsFormats: string[]; // Operand syntax, like "*" means any, "RRO" = 'Rd, Rn, Op'.

  // private _parseMap: Map<Char, (i: Instruction, e: string) => void> = new Map([
  // ]);

  constructor(fullName: string, range: TextRange) {
    this.fullName = fullName;
    this.range = range;
  }

  public parse(text: string): void {
    // Get modifier first (the part after period, like B.W)
    this.parseWidthSpecifier(text);
    text = text.substring(0, text.length - this.width.length);

    // Possible conditional
    this.parseCondition(text);
    text = text.substring(0, text.length - this.condition.length);

    // Over to instruction-specific parsing
    this.parseType(text);
    text = text.substring(0, text.length - this.type.length);

    // this.parseSpecific(text);

    this.fillInfo();
    this.validateWidth();
    this.validateSuffix();
  }

  // Attempt to separate type from core name.
  private parseType(text: string): void {
    if (!this.allowedTypes || this.allowedTypes.length === 0) {
      return;
    }
    this.allowedTypes.forEach((t) => {
      if (text.endsWith(t)) {
        this.type = t;
        this.name = text.substring(0, text.length - t.length);
        return;
      }
    });
  }

  // Parse any instruction-specific syntax
  // private parseSpecific(text: string): void {
  //   if (text.length > 0) {
  //     const parseFunc = this._parseMap[text.charCodeAt(0)];
  //     if (parseFunc) {
  //       parseFunc(this, text);
  //     }
  //   }
  // }

  // Parse possible '.X' width modifiers. Typically .W, .N, .T
  private parseWidthSpecifier(text: string): void {
    const index = text.lastIndexOf('.');
    if (index >= 0) {
      this.width = text.substring(index);
    }
  }

  private parseCondition(text: string): void {
    // https://developer.arm.com/documentation/dui0473/m/arm-and-thumb-instructions/condition-code-suffixes
    if (
      text.endsWith('EQ') ||
      text.endsWith('NE') ||
      text.endsWith('CS') ||
      text.endsWith('HS') ||
      text.endsWith('CC') ||
      text.endsWith('LO') ||
      text.endsWith('MI') ||
      text.endsWith('PL') ||
      text.endsWith('VS') ||
      text.endsWith('VC') ||
      text.endsWith('HI') ||
      text.endsWith('LS') ||
      text.endsWith('GE') ||
      text.endsWith('LT') ||
      text.endsWith('GT') ||
      text.endsWith('LE') ||
      text.endsWith('AL')
    ) {
      this.condition = text.substring(text.length - 2);
    }
  }

  private fillInfo(): void {
    const info = asmInstuctions[this.name];
    if (!info) {
      return;
    }
    const w = info['width'] as string;
    if (w) {
      this.allowedWidths = w.split('');
    }
    const s = info['suffix'] as string;
    if (w) {
      this.allowedSuffixes = s.split('');
    }
    const t = info['type'] as string;
    if (w) {
      this.allowedTypes = t.split('');
    }
    const o = info['operands'] as string;
    if (w) {
      this.operandsFormats = o.split('');
    }
  }

  private validateWidth(): void {
    if (!this.width) {
      return;
    }
    const range = new TextRangeImpl(this.range.end - this.width.length, this.width.length);
    // Does instruction permit width?
    if (!this.allowedWidths || this.allowedWidths.length === 0) {
      this.errors.push(new ParseError(ParseErrorType.WidthNotAllowed, ErrorLocation.Token, range));
    } else if (!(this.width in this.allowedWidths)) {
      this.errors.push(new ParseError(ParseErrorType.UnknownWidthSpecifier, ErrorLocation.Token, range));
    }
  }

  private validateSuffix(): void {
    if (!this.suffix) {
      return;
    }
    const range = new TextRangeImpl(this.range.start + this.name.length, this.suffix.length);
    // Does instruction permit suffix?
    if (!this.allowedSuffixes || this.allowedSuffixes.length === 0) {
      this.errors.push(new ParseError(ParseErrorType.SuffixNotAllowed, ErrorLocation.Token, range));
    } else if (!(this.suffix in this.allowedSuffixes)) {
      this.errors.push(new ParseError(ParseErrorType.UnknownSuffix, ErrorLocation.Token, range));
    }
  }
}
