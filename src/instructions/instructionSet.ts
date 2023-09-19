// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as fs from 'fs';
import * as path from 'path';
import { Instruction } from './instruction';
import { Settings, getSetting } from '../core/settings';
import { getExtensionPath, outputMessage } from '../core/utility';

export interface InstructionSet {
  readonly displayName: string;
  readonly feature: string;
  readonly docUrl: string;
  // Try to parse and locate instruction info based on
  // the instruction name as it appears in the code.
  findInstruction(candidateName: string): Instruction | undefined;
}

interface InstructionSetJson {
  readonly displayName: string;
  readonly feature: string;
  readonly docUrl: string;
  readonly instructions: readonly { name: string; instr: InstructionJson }[];
}

// Instruction information as it appears in the instruction set JSON file.
export interface InstructionJson {
  readonly desc: string;
  readonly operands: string | undefined;
  readonly type: string | undefined;
  readonly suffix: string | undefined;
  readonly specifier: string | undefined;
  readonly docName: string | undefined;
  readonly arch: string | undefined;
}

class InstructionSetImpl implements InstructionSet {
  public readonly displayName: string;
  public readonly feature: string;
  public readonly docUrl: string;

  private _map: Map<string, InstructionJson> = new Map();

  constructor(json: InstructionSetJson) {
    this.displayName = json.displayName;
    this.docUrl = json.docUrl;
    this.feature = json.feature;

    this._map = new Map();
    for (const k of Object.keys(json.instructions)) {
      const v = json.instructions[k];
      this._map.set(k.toUpperCase(), v);
    }
  }

  public findInstruction(candidateName: string): Instruction | undefined {
    throw new Error('Method not implemented.');
  }

  private findInstructionJson(name: string): InstructionJson | undefined {
    loadInstructionSets();
    const setNames = Array.from(instructionSets.keys());
   for(let i = 0; i < setNames.length; i++) {
      const set = instructionSets.get(setNames[i]);
      if (set) {
        const instr = this._map.get(name.toUpperCase());
        if (instr) {
          return instr;
        }
      }
    }
    return;
  }
}

const instructionSets: Map<string, InstructionSetImpl> = new Map();

// Loads instruction sets from JSON. Sets to load come from settings.
export function loadInstructionSets() {
  const setFolder = path.join(getExtensionPath(), 'src', 'instruction-sets');
  const setNames = getSetting<string>(Settings.instructions, 'a32;neon32').split(';');
  setNames.forEach((sn: string): void => {
    loadInstructionSet(setFolder, sn);
  });
}

export function getInstructionSet(name: string): InstructionSet | undefined {
  return instructionSets.get(name);
}

// Load single instruction set.
function loadInstructionSet(setFolder: string, setName: string): void {
  // Is the set already loaded?
  if (!instructionSets.get(setName)) {
    // Load instruction set data from JSON file.
    const setFilePath = path.join(setFolder, `${setName}.json`);
    try {
      const jsonString = fs.readFileSync(setFilePath, 'utf8');
      const iset = JSON.parse(jsonString) as InstructionSetJson;

      // Transfer instructions to a map for faster lookup.
      const set = new InstructionSetImpl(iset);
      instructionSets.set(setName, set);
    } catch (e) {
      outputMessage(`Unable to load instruction set file ${setFilePath}. Error: ${e.message}`);
    }
  }
}
