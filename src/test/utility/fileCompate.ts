// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as fs from 'fs';
import { Character } from '../../text/charCodes';

// Compares result to a baseline file line by line.
export function compareFiles(baselineFile: string, actualResult: string[], regenerateBaseline: boolean): void {
  if (regenerateBaseline) {
    const result = actualResult.join('\n');
    fs.writeFileSync(baselineFile, result);
    return;
  }

  const baselineContent = fs.readFileSync(baselineFile).toString();
  const lines = baselineContent.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const diff = compareLines(lines[i].trim(), actualResult[i]);
    expect(diff).toBe(-1);
  }
}

export function compareLines(expectedLine: string, actualLine: string): number {
  const minLength = Math.min(expectedLine.length, actualLine.length);
  let i = 0;
  for (i = 0; i < minLength; i++) {
    const act = actualLine.charAt(i);
    const exp = expectedLine.charAt(i);
    if (act !== exp) {
      return i;
    }
  }

  if (expectedLine.length === actualLine.length) {
    return -1;
  }

  if (expectedLine.length > actualLine.length) {
    // whitespace is irrelevant
    for (let j = i; j < expectedLine.length; j++) {
      if (!Character.isWhitespace(expectedLine.charCodeAt(i))) {
        return i;
      }
    }
  }

  for (let j = i; j < actualLine.length; j++) {
    if (!Character.isWhitespace(actualLine.charCodeAt(i))) {
      return i;
    }
  }

  return -1;
}
