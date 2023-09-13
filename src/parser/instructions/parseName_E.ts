// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { InstructionImpl } from './Instruction';
import { makeTriplet } from './parseInstruction';

// EOR, ERET
export function parseName_E(text: string, instr: InstructionImpl): void {
  return text === 'EORS' ? makeTriplet('EOR', 'S', '') : undefined;
}
