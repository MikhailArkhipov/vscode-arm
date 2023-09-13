// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { InstructionImpl } from './Instruction';
import { makeBasicTriplet, makeTriplet } from './parseInstruction';

// ISB, IT
export function parseName_I(text: string, instr: InstructionImpl): void {
  if (text === 'ISB') {
    return makeBasicTriplet('ISB');
  }
  // IT{x{y{z}}} {cond}
  if (text.startsWith('IT')) {
    return makeTriplet('IT', '', text.substring(2));
  }
}
