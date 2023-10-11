// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as a32set from '../instruction_sets/a32.json';
import * as a64set from '../instruction_sets/a64.json';

import { A32Set } from '../tokens/definitions';

// Instruction data in the set JSON file.
export interface InstructionData {
  readonly name: string;
  readonly doc: string;
  readonly file: string;
}

export function getAvailableInstructions(setName: string): readonly InstructionData[] {
  const result: InstructionData[] = [];
  const instructionSet = setName === A32Set ? a32set : a64set;
  Object.keys(instructionSet).forEach((name) => {
    const v = instructionSet[name] as { doc: string; file: string };
    if (v) {
      result.push({ name, doc: v.doc, file: v.file });
    }
  });
  return result;
}

export function findInstructionInfo(candidateName: string, setName: string): InstructionData | undefined {
  const instructionSet = setName === A32Set ? a32set : a64set;
  const name = candidateName.toUpperCase();
  const data = instructionSet[candidateName.toUpperCase()] as { doc: string; file: string };
  if (data) {
    return { name, doc: data.doc, file: data.file };
  }
}
