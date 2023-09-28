// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { LanguageOptions } from '../../core/languageOptions';
import { FormatOptions, Formatter } from '../../editor/formatter';
import { parseText } from '../utility/parsing';

test('Empty string', () => {
  const result = format('');
  expect(result.length).toBe(0);
});

test('Empty statement + line comment', () => {
  const result = format(' foo: // comment');
  expect(result).toBe('foo:    // comment');
});

test('Вasic statement + line comment', () => {
  const result = format(' foo:add    r1,  r2,#1// comment');
  expect(result).toBe('foo:    add r1, r2, #1 // comment');
});

test('Align statement + line comment to the left', () => {
  const result = format('  // comment\n foo:add    r1,  r2,#1');
  expect(result).toBe('// comment\nfoo:    add r1, r2, #1');
});

test('Align statement + // line comment to instruction', () => {
  const result = format('      // comment\n foo:add    r1,  r2,#1');
  expect(result).toBe('        // comment\nfoo:    add r1, r2, #1');
});

test('Whitespace 1', () => {
  const result = format('        str     fp, [sp, #-4]!');
  expect(result).toBe('    str     fp, [sp, #-4]!');
});

test('Conditional preprocessor', () => {
  const result = format('.ifdef SYM\n.err\n.endif');
  expect(result).toBe('.ifdef SYM\n.err\n.endif');
});

test('Directive + label', () => {
  const result = format('input: .byte 212, 228, 188');
  expect(result).toBe('input:  .byte 212, 228, 188');
});

test('U instructions, L registers', () => {
  const fo = new FormatOptions();
  fo.spaceAfterComma = true;
  fo.uppercaseInstructions = true;
  fo.uppercaseRegisters = false;
  fo.tabSize = 4;
  const result = formatWithOptions("cmp   R1, #'a'-1", fo);
  expect(result).toBe("    CMP r1, #'a' - 1");
});

test('L instructions U registers', () => {
  const fo = new FormatOptions();
  fo.spaceAfterComma = true;
  fo.uppercaseInstructions = false;
  fo.uppercaseRegisters = true;
  fo.tabSize = 4;
  const result = formatWithOptions("CMP   R1, #'a'-1", fo);
  expect(result).toBe("    cmp R1, #'a' - 1");
});

test('Space around operators', () => {
  const options = new FormatOptions();
  options.ignoreComments = false;
  options.spaceAfterComma = true;
  options.tabSize = 2;
  options.spaceAroundOperators = false;
  const result = formatWithOptions('    subs R7 ,  [r0-12+148]', options);
  expect(result).toBe('  subs   r7, [r0-12+148]');
});

function format(original: string): string {
  const options = new FormatOptions();
  options.ignoreComments = false;
  options.spaceAfterComma = true;
  options.tabSize = 4;
  return formatWithOptions(original, options);
}

export function formatWithOptions(
  original: string,
  formatOptions: FormatOptions
): string {
  const ast = parseText(original);
  const f = new Formatter();
  return f.formatDocument(ast.context.text.getText(), ast.context.rawTokens.asArray(), formatOptions);
}
