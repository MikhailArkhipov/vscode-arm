// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { Formatter } from '../../editor/formatter';
import { FormatOptions } from '../../editor/options';
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
  const fo = new FormatOptionsImpl();
  fo.uppercaseInstructions = true;
  fo.uppercaseRegisters = false;
  const result = formatWithOptions("cmp   R1, #'a'-1", fo);
  expect(result).toBe("    CMP r1, #'a' - 1");
});

test('L instructions U registers', () => {
  const fo = new FormatOptionsImpl();
  fo.uppercaseRegisters = true;
  const result = formatWithOptions("CMP   R1, #'a'-1", fo);
  expect(result).toBe("    cmp R1, #'a' - 1");
});

test('Space around operators', () => {
  const options = new FormatOptionsImpl();
  options.tabSize = 2;
  const result = formatWithOptions('    subs R7 ,  [r0-12+148]', options);
  expect(result).toBe('  subs   r7, [r0-12+148]');
});

function format(original: string): string {
  const options = new FormatOptionsImpl();
  return formatWithOptions(original, options);
}

export function formatWithOptions(original: string, formatOptions: FormatOptions): string {
  const ast = parseText(original);
  const f = new Formatter();
  return f.formatDocument(ast.text.getText(), ast.rawTokens.asArray(), formatOptions);
}

class FormatOptionsImpl implements FormatOptions {
  tabSize = 4;
  spaceAfterComma = true;
  spaceAroundOperators = true;
  uppercaseLabels = false;
  uppercaseDirectives = false;
  uppercaseInstructions = false;
  uppercaseRegisters = false;
  alignInstructions = true;
  alignOperands = true;
  alignInstructionsPosition = 0;
  alignOperandsPosition = 0;
  alignDirectivesToInstructions = true;
  alignBlockDirectivesToInstructions = false;
}
