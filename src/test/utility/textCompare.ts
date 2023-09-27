// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { StringReader } from '../../text/stringReader';

export function compareLines(
  expected: string,
  actual: string
): { expectedLine: string | undefined; actualLine: string | undefined; index: number; lineNumber: number } {
  const actualReader = new StringReader(actual);
  const expectedReader = new StringReader(expected);

  let lineNumber = 1;
  let index = 0;
  let expectedLine: string | undefined;
  let actualLine: string | undefined;

  for (lineNumber = 1; ; lineNumber++) {
    expectedLine = expectedReader.readLine();
    actualLine = actualReader.readLine();

    if (!expectedLine || !actualLine) {
      break;
    }

    const minLength = Math.min(expectedLine.length, actualLine.length);
    for (let i = 0; i < minLength; i++) {
      const act = actualLine.charCodeAt(i);
      const exp = expectedLine.charCodeAt(i);

      if (act !== exp) {
        index = i + 1;
        return { expectedLine, actualLine, index, lineNumber };
      }
    }

    if (expectedLine.length !== actualLine.length) {
      index = minLength + 1;
      return { expectedLine, actualLine, index, lineNumber };
    }
  }

  if (!expectedLine && !actualLine) {
    expectedLine = undefined;
    actualLine = undefined;
    lineNumber = -1;
  }

  return { expectedLine, actualLine, index, lineNumber };
}
