// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

// Compares result to a baseline file line by line.
export function compareFiles(expected: string, actual: string): void {
  const expectedLines = expected.split('\n');
  const actualLines = actual.split('\n');

  //expect(expected.length).toBe(actual.length);
  const count = Math.min(actualLines.length, expectedLines.length);
  for (let i = 0; i < count; i++) {
    expect(actualLines[i].trimEnd(), `Line ${i + 1} is different`).toBe(expectedLines[i].trimEnd());
  }
  
  if(actualLines.length > expectedLines.length) {
    expect(actualLines.length, `Actual file is ${actualLines.length - expectedLines.length} lines longer`).toBe(expected.length);
  } else if(actualLines.length < expectedLines.length) {
    expect(actualLines.length, `Actual file is ${expectedLines.length - actualLines.length} lines shorter`).toBe(expected.length);
  }
}
