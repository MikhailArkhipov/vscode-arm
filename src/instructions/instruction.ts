// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { Settings, getSetting } from '../core/settings';
import { ErrorLocation, InstructionError, ParseError, ParseErrorType } from '../parser/parseError';
import { TextRange, TextRangeImpl } from '../text/textRange';
import { findInstructionInfo } from './instructionSet';

// Fully parsed intruction with attached information
// that came from the instruction set JSON file.
export interface Instruction {
  readonly fullName: string; // LDMIANE.W
  readonly name: string; // 'LDM' - core name
  // 'S' as in ADD/ADDS or 'IA' - type, mode, effect: instruction specific
  readonly suffix: string;
  readonly condition: string; // NE/Z/...
  readonly specifier: string; // .W or .N
  readonly architecture: string; // x6M, etc.
  // Name part of the documentation page URL on ARM documentation site,
  // if different from the instruction core name. Ex {baseURL}/pld--pldw--and-pli
  readonly docName: string;
  readonly description: string;
  // Name of the parent instruction set.
  readonly instructionSet: string;

  readonly errors: readonly ParseError[];

  // InstructionInfo, split out for convenience.
  readonly allowedSpecifiers: readonly string[];
  readonly allowedSuffixes: readonly string[];
  readonly allowedTypes: readonly string[];
  readonly operandsFormats: readonly string[];
}

export function parseInstruction(text: string, range: TextRange): Instruction {
  text = text.toUpperCase();
  const instruction = new InstructionImpl(text, range);
  instruction.parse(text);
  return instruction;
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
  public specifier: string = ''; // Width, like .W or .N r a datatype, such as NEON .I16, etc.
  public architecture: string = '';
  public docName: string = '';
  public description: string;
  public instructionSet: string;

  public allowedSpecifiers: string[]; // Allowed specifiers like .W or .T or I64
  public allowedSuffixes: readonly string[] = []; // Allowed suffixes, like CPS/CPSIE/CPSID
  public allowedTypes: string[] = []; // Allowed mandatory types, like SMLALxy
  public operandsFormats: string[]; // Operand syntax, like "*" means any, "RRO" = 'Rd, Rn, Op'.
  public neon: boolean;

  // private _parseMap: Map<Char, (i: Instruction, e: string) => void> = new Map([
  // ]);

  constructor(fullName: string, range: TextRange) {
    this.fullName = fullName;
    this.range = range;
  }

  // Given text fragment figure out what instruction it is, considering
  // possible suffixes, condifions, type and width modifiers.
  // General case: NAME{type}{suffix}{condition}{width}.

  // Since we don't know instruction name initially, we cannot just fetch
  // information on suffixes and types from the instruction set file.
  // Hence we build list of candidates by first letter, then iterate
  // over them, finding the right instruction. Selection candidate by
  // a single letter does not work well with VFP/NEON since FP instructions
  // all start with V. Therefore if candidate name begins with V, we use
  // 3 letters since there are no FP instruction with just 2 letters.

  public parse(text: string): void {
    // Get width specifier first (the part after period, like B.W
    // or, with FP, .I8 or .F32.F64)
    this.parseSpecifier(text);
    text = text.substring(0, text.length - this.specifier.length);

    // Possible conditional
    this.parseCondition(text);
    text = text.substring(0, text.length - this.condition.length);

    if (this.fillInstructionInfo(text)) {
      this.parseType(text);
      text = text.substring(0, text.length - this.type.length);

      this.parseSuffix(text);
      this.name = text.substring(0, text.length - this.suffix.length);

      this.validate();
    } else {
      this.errors.push(new InstructionError(ParseErrorType.UnknownInstruction, this.range));
    }
  }

  // Parse possible '.X' width specifier. Typically .W, .N, .T.
  private parseSpecifier(text: string): void {
    // In NEON specifier is a datatype modifier and may include period.
    // For example, see VCVT.S32.F32 - thereforewe must search from the start.
    const index = text.indexOf('.');
    if (index >= 0) {
      this.specifier = text.substring(index);
    }
  }

  private parseCondition(text: string): void {
    // https://developer.arm.com/documentation/dui0473/m/arm-and-thumb-instructions/condition-code-suffixes
    if (text.length < 2) {
      return;
    }

    const ch2 = text.substring(text.length - 2).toUpperCase();
    if (
      ch2 === 'EQ' ||
      ch2 === 'NE' ||
      ch2 === 'CS' ||
      ch2 === 'HS' ||
      ch2 === 'CC' ||
      ch2 === 'LO' ||
      ch2 === 'MI' ||
      ch2 === 'PL' ||
      ch2 === 'VS' ||
      ch2 === 'VC' ||
      ch2 === 'HI' ||
      ch2 === 'LS' ||
      ch2 === 'GE' ||
      ch2 === 'LT' ||
      ch2 === 'GT' ||
      ch2 === 'LE' ||
      ch2 === 'AL'
    ) {
      this.condition = ch2;
    }
  }

  private fillInstructionInfo(candidateName: string): boolean {
    const info = findInstructionInfo(candidateName);
    if (info) {
      this.allowedSpecifiers = info.specifier?.split(' ') ?? [];
      this.allowedSuffixes = info.suffix?.split(' ') ?? [];
      this.allowedTypes = info.type?.split(' ') ?? [];
      this.operandsFormats = info.operands?.split(' ') ?? [];
      this.docName = info.docName ?? '';
      this.architecture = info.arch ?? '';
      this.description = info.desc ?? '';
      return true;
    }
    return false;
  }

  // Attempt to separate type from core name.
  private parseType(text: string): void {
    if (!this.allowedTypes || this.allowedTypes.length === 0) {
      return;
    }
    for (let i = 0; i < this.allowedTypes.length; i++) {
      const t = this.allowedTypes[i];
      if (text.endsWith(t)) {
        this.type = t;
        this.name = text.substring(0, text.length - t.length);
        return;
      }
    }
  }

  private parseSuffix(text: string): void {
    if (!this.allowedSuffixes || this.allowedSuffixes.length === 0) {
      return;
    }
    for (let i = 0; i < this.allowedSuffixes.length; i++) {
      const s = this.allowedSuffixes[i];
      if (text.endsWith(s)) {
        this.suffix = s;
        this.name = text.substring(0, text.length - s.length);
        return;
      }
    }
  }

  private validate(): void {
    if (getSetting<boolean>(Settings.editorValidation, true)) {
      this.validateSpecifier();
      this.validateSuffix();
    }
  }

  private validateSpecifier(): void {
    if (!this.allowedSpecifiers) {
      return;
    }

    if (!this.specifier) {
      // Width or datatype is not specified in code.
      // NEON requires datatype spec unless specified otherwise with <none>.
      if (this.neon && this.allowedSpecifiers.indexOf('<none>') < 0) {
        // Width or datatype specifier is required (NEON) and must be present.
        this.errors.push(new ParseError(ParseErrorType.SpecifierMissing, ErrorLocation.Token, this.range));
      }
      return; // Width is not required to be present
    }

    if (this.allowedSpecifiers.length === 1 && this.allowedSpecifiers[0] === '*') {
      // Assembler ignores the specifier, so it does not matter if it is present ot not.
      // See, for example, NEON VBIF/VBIT etc.
      return;
    }

    const range = new TextRangeImpl(this.range.end - this.specifier.length, this.specifier.length);
    // Does instruction permit width?
    if (!this.allowedSpecifiers || this.allowedSpecifiers.length === 0) {
      // Instruction does not permit width or datatype
      this.errors.push(new ParseError(ParseErrorType.SpecifierNotAllowed, ErrorLocation.Token, range));
    } else if (this.allowedSpecifiers.indexOf(this.specifier.toUpperCase()) < 0) {
      // Specifier is present but not recognized.
      this.errors.push(new ParseError(ParseErrorType.UnknownSpecifier, ErrorLocation.Token, range));
    }
  }

  private validateSuffix(): void {
    if (!this.suffix) {
      // Instruction does not have any suffix in code.
      return;
    }
    const range = new TextRangeImpl(this.range.start + this.name.length, this.suffix.length);
    // Does instruction permit suffix?
    if (!this.allowedSuffixes || this.allowedSuffixes.length === 0) {
      // Instruction does not allow suffix.
      this.errors.push(new ParseError(ParseErrorType.SuffixNotAllowed, ErrorLocation.Token, range));
    } else if (this.allowedSuffixes.indexOf(this.suffix.toUpperCase()) < 0) {
      // Specifier is present but not recognized.
      this.errors.push(new ParseError(ParseErrorType.UnknownSuffix, ErrorLocation.Token, range));
    }
  }
}
