// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { findInstructionInfo } from "./instructionSet";

// Fully parsed intruction with attached information
// that came from the instruction set JSON file.
export interface Instruction {
  readonly fullName: string; // LDMIANE.W
  readonly name: string; // 'LDM' - core name
  readonly description: string | undefined;
  readonly isValid: boolean;
}

export function parseInstruction(text: string): Instruction {
  text = text.toUpperCase();
  const instruction = new InstructionImpl(text);
  instruction.parse(text);
  return instruction;
}

class InstructionImpl implements Instruction {
  public readonly fullName: string; // LDMIANE.W

  public name: string = ''; // 'LDM' - core name
  public suffix: string = ''; // 'S' as in ADD/ADDS, may be L, X, R, ... instruction specific
  public condition: string = ''; // NE/Z/...
  public specifier: string = ''; // Width, like .W or .N r a datatype, such as NEON .I16, etc.
  public description: string;
  public isValid = true;

  constructor(fullName: string) {
    this.fullName = fullName;
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

    this.name = text;
    const info = findInstructionInfo(this.name);
    if (info) {
      this.description = info.doc;
      this.isValid = true;
    } else {
      this.isValid = false;
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
}
