// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as fs from 'fs';
import * as path from 'path';
//import { outputMessage } from '../core/utility';
import { createDeferred } from '../core/deferred';
import { A32Set, A64Set } from '../core/languageOptions';

export interface InstructionSet {
  // Try to parse and locate instruction info based on
  // the instruction name as it appears in the code.
  findInstruction(candidateName: string): InstructionJson | undefined;
  instructions: readonly InstructionJson[];
}

// Instruction data in the set JSON file.
interface InstructionJson {
  readonly name: string;
  readonly doc: string;
}

// Runtime instruction set built from the JSON data.
class InstructionSetImpl implements InstructionSet {
  private _map: Map<string, InstructionJson> = new Map();

  constructor(instructions: InstructionJson[]) {
    // Transfer to map for faster lookup.
    this._map = new Map();
    instructions.forEach((e) => {
      this._map.set(e.name.toUpperCase(), e);
    });
  }

  // Match the longest case since instructions may vary by type.
  // Ex PKHBT, PKHTB - instruction core is PKH and DT/TB are actually types.
  public findInstruction(candidateName: string): InstructionJson | undefined {
    return this._map.get(candidateName.toUpperCase());
  }

  public get instructions(): readonly InstructionJson[] {
    return Array.from(this._map.values());
  }
}

const instructionSets: Map<string, InstructionSetImpl> = new Map();

export function getAvailableInstructions(setName: string): readonly InstructionJson[] {
  const set = instructionSets.get(setName);
  return set ? set.instructions : [];
}

export function findInstructionInfo(candidateName: string, setName: string): InstructionJson | undefined {
  const set = instructionSets.get(setName);
  return set?.findInstruction(candidateName);
}

export async function loadInstructionSets(setFolder: string): Promise<void> {
  await loadInstructionSet(setFolder, A32Set);
  await loadInstructionSet(setFolder, A64Set);
}

// Load single instruction set.
function loadInstructionSet(setFolder: string, setName: string): Promise<void> {
  const loader = createDeferred<void>();

  // Is the set already loaded?
  if (instructionSets.has(setName)) {
    loader.resolve();
    return loader.promise;
  }

  // Load instruction set data from JSON file.
  const setFilePath = path.join(setFolder, `${setName}.json`);
  try {
    fs.readFile(setFilePath, 'utf8', (err, jsonString: string): void => {
      if (err) {
        //outputMessage(`Unable to load instruction set file ${setFilePath}. Error: ${err.message}`);
      } else {
        const iset = JSON.parse(jsonString) as InstructionJson[];
        // Transfer instructions to a map for faster lookup.
        const set = new InstructionSetImpl(iset);
        instructionSets.set(setName, set);
      }
      loader.resolve();
    });
  } catch (e) {
    //outputMessage(`Unable to load instruction set file ${setFilePath}. Error: ${e.message}`);
    loader.resolve();
  }
  return loader.promise;
}
