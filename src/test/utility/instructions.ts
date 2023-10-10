// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as path from 'path';
import { loadInstructionSets } from '../../instructions/instructionSet';

export async function initInstructionSets(): Promise<void> {
  const setFolder = path.join(__dirname, '..', '..', 'instruction_sets');
  return loadInstructionSets(setFolder);
}