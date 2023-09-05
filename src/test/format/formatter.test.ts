// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TestRunProfileKind } from "vscode";
import { FormatOptions, Formatter } from "../../format/formatter";
import { TextStream } from "../../text/textStream";
import { TestUtil } from "../utility";
import { AssemblerType, SyntaxConfig } from "../../syntaxConfig";

test("Empty string", () => {
  var result = format("");
  expect(result.length).toBe(0);
});

test("Empty statement + line comment", () => {
  var result = format(" foo: // comment");
  expect(result).toBe("foo:    // comment");
});

test("Вasic statement + line comment", () => {
  var result = format(" foo:add    r1,  r2,#1// comment");
  expect(result).toBe("foo:    add r1, r2, #1 // comment");
});

test("Align statement + line comment to the left", () => {
  var result = format("  // comment\n foo:add    r1,  r2,#1");
  expect(result).toBe("// comment\nfoo:    add r1, r2, #1");
});

test("Align statement + line comment to instruction", () => {
  var result = format("      // comment\n foo:add    r1,  r2,#1");
  expect(result).toBe("        // comment\nfoo:    add r1, r2, #1");
});

function formatWithOptions(original: string, options: FormatOptions): string {
  var f = new Formatter();
  return f.formatDocument(new TextStream(original), options, SyntaxConfig.create(AssemblerType.GNU));
}

function format(original: string): string {
  var options = new FormatOptions();
  options.ignoreComments = false;
  options.spaceAfterComma = true;
  options.tabSize = 4;
  return formatWithOptions(original, options);
}
