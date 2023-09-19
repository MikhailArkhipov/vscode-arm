// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as fs from 'fs';
import * as path from 'path';
import { getExtensionPath, outputMessage } from './utility';
import { Settings, getSetting } from './settings';

// Information from instruction set JSON file.
// For detailed actual information see parseInstruction.ts
export interface InstructionInfo {
  readonly desc: string;
  readonly operands: string | undefined;
  readonly type: string | undefined;
  readonly suffix: string | undefined;
  readonly specifier: string | undefined;
  readonly docName: string | undefined;
  readonly arch: string | undefined;
}

interface InstructionSet {
  readonly displayName: string;
  readonly feature: string;
  readonly docUrl: string;
  readonly instructions: readonly { name: string; instr: InstructionInfo }[];
  map: Map<string, InstructionInfo>;
}

const instructionSets: Map<string, InstructionSet> = new Map();

export function loadInstructionSets(): void {
  const schemeFolder = path.join(getExtensionPath(), 'src', 'instruction-sets');
  const setNames = getSetting<string>(Settings.instructions, 'a32;neon32').split(';');
  setNames.forEach((sn: string): void => {
    // Is the set already loaded?
    if (!instructionSets.get(sn)) {
      // Load instruction set data from JSON file.
      const setFilePath = path.join(schemeFolder, `${sn}.json`);
      try {
        const jsonString = fs.readFileSync(setFilePath, 'utf8');
        const iset = JSON.parse(jsonString) as InstructionSet;

        // Transfer instructions to a map for faster lookup.
        iset.map = new Map();
        for (const k of Object.keys(iset.instructions)) {
          const v = iset.instructions[k];
          iset.map.set(k, v);
        }
        instructionSets.set(sn, iset);
      } catch (e) {
        outputMessage(`Unable to load instruction set file ${setFilePath}. Error: ${e.message}`);
      }
    }
  });
}

export function findInstruction(name: string): InstructionInfo | undefined {
  loadInstructionSets();
  const setNames = Array.from(instructionSets.keys());
 for(let i = 0; i < setNames.length; i++) {
    const set = instructionSets.get(setNames[i]);
    if (set) {
      const instr = set.map.get(name.toUpperCase());
      if (instr) {
        return instr;
      }
    }
  }
  return;
}
