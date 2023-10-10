// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as fs from 'fs';
import * as path from 'path';

import { Tokenizer } from '../../tokens/tokenizer';
import { detectInstructionSet } from '../../editor/detectors';
import { TextStream } from '../../text/textStream';
import { A32Set, A64Set } from '../../tokens/definitions';

test('Detect t1.s', async () => {
  const set = detectSet('t1');
  expect(set).toBe(A32Set);
});

function detectSet(fileName: string): string {
  const filePath = path.join(__dirname, 'files', fileName + '.s');
  const documentText = fs.readFileSync(filePath, 'utf-8');

  const t = new Tokenizer(A64Set);
  let tokens = t.tokenize(new TextStream(documentText));
  return detectInstructionSet(documentText, tokens);
}
