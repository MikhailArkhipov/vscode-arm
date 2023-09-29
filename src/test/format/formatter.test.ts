// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { Formatter } from '../../editor/formatter';
import { FormatOptions } from '../../editor/options';
import { createAstAsync } from '../utility/parsing';

test('Empty string', async () => {
  const result = await formatAsync('');
  expect(result.length).toBe(0);
});

test('Empty statement + line comment', async () => {
  const result = await formatAsync(' foo: // comment');
  expect(result).toBe('foo:    // comment');
});

test('Вasic statement + line comment', async () => {
  const result = await formatAsync(' foo:add    r1,  r2,#1// comment');
  expect(result).toBe('foo:    add r1, r2, #1 // comment');
});

test('Align statement + line comment to the left', async () => {
  const result = await formatAsync('  // comment\n foo:add    r1,  r2,#1');
  expect(result).toBe('// comment\nfoo:    add r1, r2, #1');
});

test('Align statement + // line comment to instruction', async () => {
  const result = await formatAsync('      // comment\n foo:add    r1,  r2,#1');
  expect(result).toBe('        // comment\nfoo:    add r1, r2, #1');
});

test('Whitespace 1', async () => {
  const result = await formatAsync('        str     fp, [sp, #-4]!');
  expect(result).toBe('    str     fp, [sp, #-4]!');
});

test('Conditional preprocessor', async () => {
  const result = await formatAsync('.ifdef SYM\n.err\n.endif');
  expect(result).toBe('.ifdef SYM\n.err\n.endif');
});

test('Directive + label', async () => {
  const result = await formatAsync('input: .byte 212, 228, 188');
  expect(result).toBe('input:  .byte 212, 228, 188');
});

test('U instructions, L registers', async () => {
  const fo = new FormatOptionsImpl();
  fo.uppercaseInstructions = true;
  fo.uppercaseRegisters = false;
  const result = await formatAsync("cmp   R1, #'a'-1", fo);
  expect(result).toBe("    CMP r1, #'a' - 1");
});

test('L instructions U registers', async () => {
  const fo = new FormatOptionsImpl();
  fo.uppercaseRegisters = true;
  const result = await formatAsync("CMP   R1, #'a'-1", fo);
  expect(result).toBe("    cmp R1, #'a' - 1");
});

test('Space around operators', async () => {
  const options = new FormatOptionsImpl();
  options.tabSize = 2;
  const result = await formatAsync('    subs R7 ,  [r0-12+148]', options);
  expect(result).toBe('  subs   r7, [r0-12+148]');
});

export async function formatAsync(original: string, formatOptions?: FormatOptions): Promise<string> {
  formatOptions = formatOptions ?? new FormatOptionsImpl();
  const ast = await createAstAsync(original);
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
