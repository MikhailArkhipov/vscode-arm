// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextRange } from '../../text/textRange';
import { ParseError } from '../parseError';

export interface Instruction {
  readonly fullName: string; // LDMIANE.W
  readonly name: string; // 'LDM' - core name
    // 'S' as in ADD/ADDS or 'IA' - type, mode, effect: instruction specific
  readonly suffix: string;
  readonly condition: string; // NE/Z/...
  readonly modifier: string; // .W or .N
  readonly errors: ParseError[];

  readonly allowedModifiers: string[];
  readonly allowedSuffixes: string[];
  readonly allowedOperands: string;
}

export class InstructionImpl implements Instruction {
  public readonly fullName: string; // LDMIANE.W
  public readonly range: TextRange;
  public readonly errors: ParseError[] = [];

  public name: string = ''; // 'LDM' - core name
  // 'S' as in ADD/ADDS or 'IA' - type, mode, effect: instruction specific
  public suffix: string = ''; 
  public condition: string = ''; // NE/Z/...
  public modifier: string = ''; // .W or .N

  public allowedModifiers: string[]; // Allowed modifiers like .W or .T
  public allowedSuffixes: string[] = []; // Allowed types or effects, like CPS/CPSIE/CPSID
  public allowedOperands: string; // Operand syntax, like "*" means any, "RRO" = 'Rd, Rn, Op'.

  constructor(fullName: string, range: TextRange) {
    this.fullName = fullName;
    this.range = range;
  }
}
