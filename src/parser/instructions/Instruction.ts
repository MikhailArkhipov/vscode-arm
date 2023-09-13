// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextRange } from '../../text/textRange';
import { ParseError } from '../parseError';

export interface Instruction {
  readonly fullName: string; // LDMIANE.W
  readonly name: string; // 'LDM' - core name
  readonly suffix: string; // 'S' as in ADD/ADDS
  readonly type: string; // 'IA' - type, mode, effect: instruction specific
  readonly condition: string; // NE/Z/...
  readonly modifier: string; // .W or .N
  readonly errors: ParseError[];
}

export class InstructionImpl implements Instruction {
  public readonly fullName: string; // LDMIANE.W
  public readonly range: TextRange;
  public readonly errors: ParseError[] = [];

  public name: string = ''; // 'LDM' - core name
  public suffix: string = ''; // 'S' as in ADD/ADDS
  public type: string = ''; // 'IA' - type, mode, effect: instruction specific
  public condition: string = ''; // NE/Z/...
  public modifier: string = ''; // .W or .N

  constructor(fullName: string, range: TextRange) {
    this.fullName = fullName;
    this.range = range;
  }
}
