// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as fs from 'fs';
import * as path from 'path';
import { Settings, getSetting } from '../core/settings';
import { getExtensionPath, outputMessage } from '../core/utility';
import { createDeferred } from '../core/deferred';

export interface InstructionSet {
  readonly displayName: string;
  readonly feature: string;
  readonly docUrl: string;
  // Try to parse and locate instruction info based on
  // the instruction name as it appears in the code.
  findInstruction(candidateName: string): Promise<InstructionJsonInfo | undefined>;
}

interface InstructionSetJson {
  readonly displayName: string;
  readonly feature: string;
  readonly docUrl: string;
  readonly instructions: readonly { name: string; instr: InstructionJsonInfo }[];
}

// Instruction information as it appears in the instruction set JSON file.
export interface InstructionJsonInfo {
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

  private _map: Map<string, InstructionJsonInfo> = new Map();

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

  // Chicken and egg issue - in order to parse type and suffix, we need to know
  // if instruction supports types. However, in order to get this information
  // from the instruction set file, we need to know instruction name which
  // we don't until we find out core name of the instruction.
  public async findInstruction(candidateName: string): Promise<InstructionJsonInfo | undefined> {
    await loadInstructionSets();
    // Try candidate as is
    let info = this.findInstructionJsonInfo(candidateName);
    if (!info && candidateName.length > 1) {
      // Chop off character assuming there is a suffix.
      info = this.findInstructionJsonInfo(candidateName.substring(0, candidateName.length - 1));
      if (!info && candidateName.length > 2) {
        // Perhaps it is a two-letter type.
        info = this.findInstructionJsonInfo(candidateName.substring(0, candidateName.length - 2));
      }
    }
    return info;
  }

  private findInstructionJsonInfo(name: string): InstructionJsonInfo | undefined {
    const setNames = Array.from(instructionSets.keys());
    const candidate = name.toUpperCase();
    for (let i = 0; i < setNames.length; i++) {
      const set = instructionSets.get(setNames[i]);
      if (set) {
        const instr = this._map.get(candidate);
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
export async function loadInstructionSets(): Promise<void> {
  const setFolder = path.join(getExtensionPath(), 'src', 'instruction_sets');
  const setNames = getSetting<string>(Settings.instructions, 'a32;neon32').split(';');
  for(let i = 0; i < setNames.length; i++) {
    await loadInstructionSet(setFolder, setNames[i]);
  }
}

export function getInstructionSet(name: string): InstructionSet | undefined {
  return instructionSets.get(name);
}

export async function findInstructionInfo(candidateName: string): Promise<InstructionJsonInfo | undefined> {
  const setNames = Array.from(instructionSets.keys());
  for (let i = 0; i < setNames.length; i++) {
    const set = instructionSets.get(setNames[i]);
    if (set) {
      const found = await set.findInstruction(candidateName);
      if (found) {
        return found;
      }
    }
  }
}

// Load single instruction set.
function loadInstructionSet(setFolder: string, setName: string): Promise<void> {
  const deferred = createDeferred<void>();
  
  // Is the set already loaded?
  if (instructionSets.get(setName)) {
    deferred.resolve();
    return deferred.promise;
  }

  // Load instruction set data from JSON file.
  const setFilePath = path.join(setFolder, `${setName}.json`);
  try {
    fs.readFile(setFilePath, 'utf8', (err, jsonString: string): void => {
      if (err) {
        outputMessage(`Unable to load instruction set file ${setFilePath}. Error: ${err.message}`);
      } else {
        const iset = JSON.parse(jsonString) as InstructionSetJson;
        // Transfer instructions to a map for faster lookup.
        const set = new InstructionSetImpl(iset);
        instructionSets.set(setName, set);
      }
      deferred.resolve();
    });
  } catch (e) {
    outputMessage(`Unable to load instruction set file ${setFilePath}. Error: ${e.message}`);
    deferred.resolve();
  }
  return deferred.promise;
}
