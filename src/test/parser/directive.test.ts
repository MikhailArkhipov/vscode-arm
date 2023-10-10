// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

/* spell-checker: disable */
import { A32Set } from '../../tokens/definitions';
import { verifyAst } from '../utility/parsing';

test('ldr r0, =1f', () => {
  const code = String.raw`
  .macro x
    ldr r0, =1f
  `;
  const expected = String.raw`
  EmptyStatement
  Macro:3 x [3...11)
    Token:2:6 .macro [3...9)
    Token:3:11 x [10...11)
  Instruction ldr [16...27)
    Token:3:1 ldr [16...19)
    Token:3:2 r0 [20...22)
    Token:4:0 , [22...23)
    Token:13:0 = [24...25)
    Token:3:13 1f [25...27)
`;
  verifyAst(expected, code, A32Set);
});

test('Declare symbol via .asciz', () => {
  const code = 'a: .asciz	"a"';
  const expected = String.raw`
  Declaration:(a:) .asciz [0...13)
    Token:1:4 a: [0...2)
    Token:2:4 .asciz [3...9)
    Token:5:0 "a" [10...13)`;
  verifyAst(expected, code, A32Set);
});

test('a = b', () => {
  const code = 'a = b';
  const expected = String.raw`
Equals:(a) = b [0...5)
  Token:3:0 a [0...1)
  Token:13:0 = b [2...3)
  Token:3:0 b [4...5)
`;
  verifyAst(expected, code, A32Set);
});

test('w: . = . + 256', () => {
  const code = 'w: . = . + 256';
  const expected = String.raw`
  Equals:(.) = [0...14)
    Token:1:0 w: [0...2)
    Token:3:0 . [3...4)
    Token:13:0 = [5...6)
    Token:3:0 . [7...8)
    Token:13:0 + [9...10)
    Token:6:0 256 [11...14)`;
  verifyAst(expected, code);
});

test('.equ N, 3', () => {
  const code = '.equ N, 3';
  const expected = String.raw`
Definition:(N) .equ [0...9)
  Token:2:3 .equ [0...4)
  Token:3:3 N [5...6)
  Token:4:0 , [6...7)
  Token:6:0 3 [8...9)`;
  verifyAst(expected, code, A32Set);
});
