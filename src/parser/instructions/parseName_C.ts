// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { InstructionImpl } from './Instruction';
import { makeTriplet } from './parseInstruction';

// CBZ, CBNZ, CDP, CDP2, CLREX, CLZ, CMP, CMN, CPS, CPY
export function parseName_C(text: string, instr: InstructionImpl): void {
  if (text.startsWith('CPS')) {
    return makeTriplet('CPS', '', text.substring(3, text.length - 3));
  }
}
