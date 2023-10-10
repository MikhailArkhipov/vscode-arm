// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { StringReader } from "../../text/stringReader";

test("StringReader EOL", () => {
  const text = "a\r\n\nb\rc\nd\n";
  const sr = new StringReader(text);
  let line = sr.readLine();
  expect(line).toBe('a');
  line = sr.readLine();
  expect(line).toBe('');
  line = sr.readLine();
  expect(line).toBe('b');
  line = sr.readLine();
  expect(line).toBe('c');
  line = sr.readLine();
  expect(line).toBe('d');
  line = sr.readLine();
  expect(line).toBeUndefined();  
});