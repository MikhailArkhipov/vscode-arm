// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { InstructionImpl } from './Instruction';


// LDC, LDC2, LDM, LDR, LDREX, LSL, LSR
export function parseName_L(text: string, instr: InstructionImpl): void {
  if (text.startsWith('LDC2')) {
    return makeTriplet('LDC2', '', text.substring(4));
  }
  if (text.startsWith('LDC')) {
    return makeTriplet('LDC', '', text.substring(3));
  }
  // LDM{addr_mode}{cond} Rn{!}, reglist{^}
  if (text.startsWith('LDM')) {
    return makeTriplet('LDM', '', text.substring(3));
  }

  return makeBasicTriplet(text);
}
