// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as fs from 'fs';
import * as path from 'path';
//import { outputMessage } from '../core/utility';
import { Deferred, createDeferred } from '../core/deferred';

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
      this._map.set(e.name, e);
    });
  }

  // Match the longest case since instructions may vary by type.
  // Ex PKHBT, PKHTB - instruction core is PKH and DT/TB are actually types.
  public findInstruction(candidateName: string): InstructionJson | undefined {
    return this._map.get(candidateName);
  }

  public get instructions(): readonly InstructionJson[] {
    return Array.from(this._map.values());
  }
}

let _currentInstructionSetName: string;
let _currentInstructionSet: InstructionSetImpl;
let _runningLoader: Deferred<void>;

export async function waitForInstructionSetLoadingComplete(): Promise<void> {
  return await _runningLoader.promise;
}

export function currentInstructionSetName(): string {
  return _currentInstructionSetName;
}

export function getAvailableInstructions(): readonly InstructionJson[] {
  return _currentInstructionSet ? _currentInstructionSet.instructions : [];
}

export function findInstructionInfo(candidateName: string): InstructionJson | undefined {
  return _currentInstructionSet?.findInstruction(candidateName);
}

export async function findInstructionInfoAsync(candidateName: string): Promise<InstructionJson | undefined> {
  if(_runningLoader) {
    await _runningLoader.promise;
    return _currentInstructionSet?.findInstruction(candidateName);
  }
}

// Load single instruction set.
export function loadInstructionSet(setFolder: string, setName: string): Promise<void> {
  _runningLoader = createDeferred<void>();

  // Is the set already loaded?
  if (_currentInstructionSetName === setName) {
    _runningLoader.resolve();
    return _runningLoader.promise;
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
        _currentInstructionSet = set;
        _currentInstructionSetName = setName;
      }
      _runningLoader.resolve();
    });
  } catch (e) {
    //outputMessage(`Unable to load instruction set file ${setFilePath}. Error: ${e.message}`);
    _runningLoader.resolve();
  }
  return _runningLoader.promise;
}
