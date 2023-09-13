// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextRangeImpl } from '../../text/textRange';
import { InstructionError, ParseErrorType } from '../parseError';
import { InstructionImpl } from './Instruction';

// B, BFC, BFI, BIC, BKPT, BL, BLX, BX, BXJ
export function parseName_B(text: string, i: InstructionImpl): void {
  switch (text) {
    case 'B':
    case 'BL':
    case 'BLX':
      if (i.modifier !== '.W' && i.modifier !== '.N') {
        const range = new TextRangeImpl(i.range.end - i.modifier.length, i.modifier.length);
        i.errors.push(new InstructionError(ParseErrorType.InvalidModifier, range));
      }
      if (i.suffix.length > 0) {
        i.errors.push(new InstructionError(ParseErrorType.SuffixNotAllowed, i.range));
      }
      break;

    case 'BFC':
    case 'BFI':
    case 'BKPT':
    case 'BX':
    case 'BXJ':
      if (i.suffix.length > 0) {
        i.errors.push(new InstructionError(ParseErrorType.SuffixNotAllowed, i.range));
      }
      if (i.modifier.length > 0) {
        i.errors.push(new InstructionError(ParseErrorType.ModifierNotAllowed, i.range));
      }
      break;

    case 'BIC':
      if (i.modifier.length > 0) {
        i.errors.push(new InstructionError(ParseErrorType.ModifierNotAllowed, i.range));
      }
      break;

    default:
      i.errors.push(new InstructionError(ParseErrorType.UnknownInstruction, i.range));
      break;
  }
}
