// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { InstructionError, ParseErrorType } from '../parseError';
import { InstructionImpl } from './Instruction';

// CBZ, CBNZ, CDP, CDP2, CLREX, CLZ, CMP, CMN, CPS, CPY
export function parseName_C(text: string, i: InstructionImpl): void {
  switch (text) {
    case 'CPS':
      if (i.type.length > 0 && i.type !== 'IE' && i.type !== 'ID') {
        i.errors.push(new InstructionError(ParseErrorType.InvalidEffect, i.range));
      }
      if (i.suffix.length > 0) {
        i.errors.push(new InstructionError(ParseErrorType.SuffixNotAllowed, i.range));
      }
      break;
      case 'CPY':
        if (i.suffix.length > 0) {
          i.errors.push(new InstructionError(ParseErrorType.SuffixNotAllowed, i.range));
        }
        if (i.type.length > 0) {
          i.errors.push(new InstructionError(ParseErrorType.TypeNotAllowed, i.range));
        }
    
        break;
    default:
      i.errors.push(new InstructionError(ParseErrorType.UnknownInstruction, i.range));
      break;
  }
}
