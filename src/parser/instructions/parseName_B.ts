// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextRangeImpl } from '../../text/textRange';
import { ErrorLocation, ParseError, ParseErrorType } from '../parseError';
import { InstructionImpl } from './Instruction';

// B, BFC, BFI, BIC, BKPT, BL, BLX, BX, BXJ
export function parseName_B(text: string, i: InstructionImpl): void {
  switch (text) {
    case 'B':
      if (i.modifier !== '.W' && i.modifier !== '.N') {
        const range = new TextRangeImpl(i.range.end - i.modifier.length, i.modifier.length);
        i.errors.push(new ParseError(ParseErrorType.Instruction_InvalidModifier, ErrorLocation.Token, range));
      } 
      if (i.suffix.length > 0) {
        i.errors.push(new ParseError(ParseErrorType.Instruction_DoesNotPermitSuffix, ErrorLocation.Token, i.range));
      }
      break;

    default:
      i.errors.push(new ParseError(ParseErrorType.Instruction_Unknown, ErrorLocation.Token, i.range));
      break;
  }
}
