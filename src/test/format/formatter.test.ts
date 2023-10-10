// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as fs from 'fs';
import * as path from 'path';

import { Formatter } from '../../editor/formatter';
import { FormatOptions } from '../../editor/options';
import { createAst } from '../utility/parsing';
import { CasingType, detectCasingStyle, detectInstructionSet } from '../../editor/detectors';
import { compareFiles } from '../utility/fileCompare';
import { Tokenizer } from '../../tokens/tokenizer';
import { TextStream } from '../../text/textStream';
import { A32Set, A64Set } from '../../tokens/definitions';

test('Empty string', async () => {
  const result = await format('');
  expect(result.length).toBe(0);
});

test('Empty statement + line comment', async () => {
  const result = await format(' foo: // comment');
  expect(result).toBe('foo: // comment\n');
});

test('Вasic statement + line comment', async () => {
  const result = await format(' foo:add    r1,  r2,#1// comment');
  expect(result).toBe(String.raw`foo:
    add r1, r2, #1 // comment
`);
});

test('Align statement + line comment to the left', async () => {
  const result = await format('\n // comment\n foo:add    r1,  r2,#1');
  expect(result).toBe(String.raw`
// comment
foo:
    add r1, r2, #1
`);
});

test('Align statement + // line comment to instruction', async () => {
  const result = await format('\n      // comment\n foo:add    r1,  r2,#1');
  expect(result).toBe(String.raw`
    // comment
foo:
    add r1, r2, #1
`);
});

test('No extra lines after label break', async () => {
  const result = await format('label:\n // comment');
  expect(result).toBe('label:\n// comment\n');
});

test('No extra lines at the end', async () => {
  const result = await format('label:\n // comment\n\n\n\n');
  expect(result).toBe('label:\n// comment\n');
});

test('No extra lines between instructions', async () => {
  const result = await format('mov r1, r2, r3\n\n\nmov r1, r2, r3');
  expect(result).toBe('    mov r1, r2, r3\n\n    mov r1, r2, r3\n');
});

test('Whitespace 1', async () => {
  const result = await format('        str     fp, [sp, #-4]!');
  expect(result).toBe('    str fp, [sp, #-4]!\n');
});

test('Conditional preprocessor', async () => {
  const result = await format(String.raw`.ifdef SYM
.err
.endif
  `);
  expect(result).toBe(String.raw`.ifdef SYM
.err
.endif
`);
});

test('Directive + label', async () => {
  const result = await format('input: .byte 212, 228, 188');
  expect(result).toBe('input:  .byte   212, 228, 188\n');
});

test('U instructions, L registers', async () => {
  const fo = new FormatOptionsImpl();
  fo.uppercaseInstructions = true;
  fo.uppercaseRegisters = false;
  const result = await format("cmp   X1, #'a'-1", fo);
  expect(result).toBe("    CMP x1, #'a'-1\n");
});

test('L instructions U registers', async () => {
  const fo = new FormatOptionsImpl();
  fo.uppercaseInstructions = false;
  fo.uppercaseRegisters = true;
  const result = await format("CMP   r1, #'a'-1", fo, A32Set);
  expect(result).toBe("    cmp R1, #'a'-1\n");
});

test('Space around operators off', async () => {
  const options = new FormatOptionsImpl();
  options.tabSize = 2;
  options.spaceAroundOperators = false;
  const result = await format('    subs w7 ,  [q0-12+148]', options);
  expect(result).toBe('  subs  w7, [q0-12+148]\n');
});

test('Space around operators on', async () => {
  const options = new FormatOptionsImpl();
  options.spaceAroundOperators = true;
  const result = await format('  subs R7 ,  [r0-12+148]', options, A32Set);
  expect(result).toBe('    subs    r7, [r0 - 12 + 148]\n');
});

test('Equals operator no space', async () => {
  const options = new FormatOptionsImpl();
  options.spaceAroundOperators = true;
  const result = await format('ldr r1, =r2\nldr r1, =[r2]', options);
  expect(result).toBe('    ldr r1, =r2\n    ldr r1, =[r2]\n');
});

test('C preprocessor', async () => {
  const result = await format('#define A  1');
  expect(result).toBe('#define A  1\n');
});

test('Block comment to instruction', async () => {
  const result = await format(String.raw`
  /********************
   * Exit syscall
   *********************/
   mov   x8, #93
  svc   0
`);
  expect(result).toBe(String.raw`
   /********************
    * Exit syscall
    *********************/
    mov x8, #93
    svc 0
`);
});

test('Multiline block comment', async () => {
  const result = await format(
    String.raw`
     /*write syscall*/
    mov   x0, #1 
`
  );
  expect(result).toBe(String.raw`
    /*write syscall*/
    mov x0, #1
`);
});

test('EOL comment group', async () => {
  const result = await format(
    String.raw`
    mov r0,  #7   @i = 7
   mov r1, #0     @c = 0
     mov r2,#7     @a = 7
`
  );
  expect(result).toBe(String.raw`
    mov r0, #7    @i = 7
    mov r1, #0    @c = 0
    mov r2, #7    @a = 7
`);
});

test('EOL comment group with tabs', async () => {
  const options = new FormatOptionsImpl();
  options.tabSize = 4;
  const result = await format("\n\
\tadd r1, r1, r2\t\t@c = c + a;\n\
\tadd r2, #1\t\t@a++\n\
\tadd r0, #1\t\t@i++\n\
\tcmp r0, #6\t\t@is i > 6\n\
\tbgt lessthan6\t\t@keep looping if i is greater than 6\n\
\tblt exit\t\t@exit if i is less than 6\n",
    options
  );
  expect(result).toBe(String.raw`
    add r1, r1, r2              @c = c + a;
    add r2, #1                  @a++
    add r0, #1                  @i++
    cmp r0, #6                  @is i > 6
    bgt lessthan6               @keep looping if i is greater than 6
    blt exit                    @exit if i is less than 6
`);
});

test('.EQU N, 100', async () => {
  const fo = new FormatOptionsImpl();
  fo.uppercaseDirectives = true;
  const result = await format(
    String.raw`
     .equ	N,  100
   mov x0, #1
`,
    fo
  );
  expect(result).toBe(String.raw`
    .EQU N, 100
    mov x0, #1
`);
});

test('Format file t1.s', async () => {
  await formatFile('t1');
});

test('Format file t2.s', async () => {
  await formatFile('t2');
});

test('Format file t3.s', async () => {
  await formatFile('t3');
});

test('Format file t4.s', async () => {
  await formatFile('t4');
});

test('Format file t5.s', async () => {
  await formatFile('t5');
});

test('Format file t6.s', async () => {
  await formatFile('t6');
});

function format(original: string, formatOptions?: FormatOptions, instructionSet = A64Set): string {
  formatOptions = formatOptions ?? new FormatOptionsImpl();
  const f = new Formatter();
  return f.formatDocument(original, formatOptions, instructionSet);
}

class FormatOptionsImpl implements FormatOptions {
  tabSize = 4;
  spaceAfterComma = true;
  spaceAroundOperators = true;
  uppercaseLabels = false;
  uppercaseDirectives = false;
  uppercaseInstructions = false;
  uppercaseRegisters = false;
  labelsOnSeparateLines = true;
  alignOperands = true;
  alignEolComments = true;
}

function formatFile(fileName: string): void {
  const filePath = path.join(__dirname, 'files', fileName + '.s');
  const documentText = fs.readFileSync(filePath, 'utf-8');

  const t = new Tokenizer(A64Set);
  let tokens = t.tokenize(new TextStream(documentText));
  const instructionSet = detectInstructionSet(documentText, tokens);

  const formatter = new Formatter();
  const ast = createAst(documentText, instructionSet);
  const detectedStyle = detectCasingStyle(documentText, ast.tokens.asArray());

  const fo = makeDefaultFormatOptions();
  fo.uppercaseLabels = detectedStyle.labels === CasingType.Upper;
  fo.uppercaseDirectives = detectedStyle.directives === CasingType.Upper;
  fo.uppercaseInstructions = detectedStyle.instructions === CasingType.Upper;
  fo.uppercaseRegisters = detectedStyle.registers === CasingType.Upper;

  const formattedText = formatter.formatDocument(documentText, fo);
  const baselinePath = path.join(__dirname, 'files', fileName + '.formatted.s');
  //fs.writeFileSync(baselinePath, formattedText, 'utf-8');
  //return;
  const baselineText = fs.readFileSync(baselinePath, 'utf-8');
  compareFiles(baselineText, formattedText);
}

function makeDefaultFormatOptions(): FormatOptions {
  const fo = new FormatOptionsImpl();
  fo.tabSize = 4;
  fo.spaceAfterComma = true;
  fo.labelsOnSeparateLines = true;
  fo.alignOperands = true;
  fo.alignEolComments = true;
  return fo;
}
