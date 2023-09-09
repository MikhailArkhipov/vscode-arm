// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { FormatOptions, Formatter } from "../../editor/formatter";
import { TextStream } from "../../text/textStream";
import { AssemblerType, SyntaxConfig } from "../../syntaxConfig";

test("Empty string", () => {
  const result = format("");
  expect(result.length).toBe(0);
});

test("Empty statement + line comment", () => {
  const result = format(" foo: // comment");
  expect(result).toBe("foo:    // comment");
});

test("Вasic statement + line comment", () => {
  const result = format(" foo:add    r1,  r2,#1// comment");
  expect(result).toBe("foo:    add r1, r2, #1 // comment");
});

test("Align statement + line comment to the left", () => {
  const result = format("  // comment\n foo:add    r1,  r2,#1");
  expect(result).toBe("// comment\nfoo:    add r1, r2, #1");
});

test("Align statement + line comment to instruction", () => {
  const result = format("      // comment\n foo:add    r1,  r2,#1");
  expect(result).toBe("        // comment\nfoo:    add r1, r2, #1");
});

function formatWithOptions(original: string, options: FormatOptions): string {
  const f = new Formatter();
  return f.formatDocument(new TextStream(original), options, SyntaxConfig.create(AssemblerType.GNU));
}

function format(original: string): string {
  const options = new FormatOptions();
  options.ignoreComments = false;
  options.spaceAfterComma = true;
  options.tabSize = 4;
  return formatWithOptions(original, options);
}
