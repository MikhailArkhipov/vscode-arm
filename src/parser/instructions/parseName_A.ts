// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { Char } from '../../text/charCodes';
import { InstructionError, ParseErrorType } from '../parseError';
import { InstructionImpl } from './Instruction';

// ADC, ADD, ADR, ADRL, AND, ASR
export function parseName_A(text: string, i: InstructionImpl): void {
  i.suffix = text.charCodeAt(text.length - 1) === Char.S ? 'S' : '';
  i.name = text.substring(0, text.length - i.suffix.length);

  switch (i.name) {
    case 'ADC':
    case 'ADD':
    case 'AND':
    case 'ASR':
      if (i.modifier.length > 0) {
        i.errors.push(new InstructionError(ParseErrorType.ModifierNotAllowed, i.range));
      }
      break;

    case 'ADR':
      if (i.suffix.length > 0) {
        i.errors.push(new InstructionError(ParseErrorType.SuffixNotAllowed, i.range));
      }
      break;

    case 'ADRL':
      if (i.suffix.length > 0) {
        i.errors.push(new InstructionError(ParseErrorType.SuffixNotAllowed, i.range));
      }
      if (i.modifier.length > 0) {
        i.errors.push(new InstructionError(ParseErrorType.ModifierNotAllowed, i.range));
      }
      break;

    default:
      i.errors.push(new InstructionError(ParseErrorType.UnknownInstruction, i.range));
      break;
  }
}
