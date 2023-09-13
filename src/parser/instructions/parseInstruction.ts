// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as asmInstuctions from "../../arm-instructions.json";

import { Char } from '../../text/charCodes';
import { TextRange, TextRangeImpl } from '../../text/textRange';
import { ErrorLocation, ParseError, ParseErrorType } from '../parseError';
import { Instruction, InstructionImpl } from './Instruction';
import { parseName_A } from './parseName_A';
import { parseName_B } from './parseName_B';
import { parseName_C } from './parseName_C';
import { parseName_E } from './parseName_E';
import { parseName_I } from './parseName_I';
import { parseName_L } from './parseName_L';

// LDR{type}T{cond}
// ADD{cond}S
// ADR{cond}{}.W}
const parseMap: Map<Char, (e: string, instr: InstructionImpl) => void> = new Map([
  [Char.A, parseName_A],
  [Char.B, parseName_B],
  [Char.C, parseName_C],
  [Char.E, parseName_E],
  [Char.I, parseName_I],
  [Char.L, parseName_L],
]);

export function parseInstruction(text: string, range: TextRange): Instruction {
  text = text.toUpperCase();
  const i = new InstructionImpl(text, range);

  // Get modifier first (the part after period, like B.W)
  parseModifier(text, i);
  if (i.modifier.length > 0) {
    text = text.substring(0, text.length - i.modifier.length);
  }
  // Possible conditional
  parseCondition(text, i);
  if (i.condition.length > 0) {
    text = text.substring(0, text.length - i.condition.length);
  }

  // Over to instruction-specific parsing
  parseName(text, i);

  // Verify modifier
  // Verify type/effect
  // Verify operand syntax

  return i;
}

// Parse full name verifying instruction-specific syntax where possible.
function parseName(text: string, i: InstructionImpl): void {
  if (text.length > 0) {
    const parseFunc = parseMap[text.charCodeAt(0)];
    if (parseFunc) {
      parseFunc(text, i);
    }
  }
}

function getAllowedSyntax(name: string, i: InstructionImpl): boolean {

}



function parseModifier(text: string, i: InstructionImpl): void {
  const index = text.lastIndexOf('.');
  if (index >= 0) {
    i.modifier = text.substring(index);


    if (i.modifier !== '.W' && i.modifier !== '.N' && i.modifier !== '.T') {
      const range = new TextRangeImpl(i.range.end - i.modifier.length, i.modifier.length);
      i.errors.push(new ParseError(ParseErrorType.UnknownModifier, ErrorLocation.Token, range));
    }
  }
}

function parseCondition(text: string, i: InstructionImpl): void {
  // https://developer.arm.com/documentation/dui0473/m/arm-and-thumb-instructions/condition-code-suffixes
  if (
    text.endsWith('EQ') ||
    text.endsWith('NE') ||
    text.endsWith('CS') ||
    text.endsWith('HS') ||
    text.endsWith('CC') ||
    text.endsWith('LO') ||
    text.endsWith('MI') ||
    text.endsWith('PL') ||
    text.endsWith('VS') ||
    text.endsWith('VC') ||
    text.endsWith('HI') ||
    text.endsWith('LS') ||
    text.endsWith('GE') ||
    text.endsWith('LT') ||
    text.endsWith('GT') ||
    text.endsWith('LE') ||
    text.endsWith('AL')
  ) {
    i.condition = text.substring(text.length - 2);
  }
}
