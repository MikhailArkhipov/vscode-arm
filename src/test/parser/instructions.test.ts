// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import {
  AstNode,
  Statement,
  TokenNode,
} from '../../AST/definitions';
import { A32Set, A64Set, TokenSubType, TokenType } from '../../tokens/definitions';
import { createAstAsync, verifyAstAsync as verifyAstAsync, verifyAstTokens, verifyTokenNode } from '../utility/parsing';

test('Simple A32 instruction', async () => {
  const root = await createAstAsync('add r1, r2, #1', A32Set);
  let child: AstNode;

  expect(root).toBeDefined();
  expect(root.children.count).toBe(1);

  expect(root.errors.length).toBe(0);
  const c1 = root.children.getItemAt(0);

  const s = c1 as Statement;
  expect(s.children.count).toBe(6); // name and list of operands
  child = s.children.getItemAt(0);
  let tn = child as TokenNode;
  verifyTokenNode(tn, root.text, TokenType.Symbol, 'add', TokenSubType.Instruction);

  tn = s.children.getItemAt(1) as TokenNode;
  expect(tn.children.count).toBe(0);
  verifyTokenNode(tn, root.text, TokenType.Symbol, 'r1', TokenSubType.Register);
});

test('str fp, [sp, #-4]!', async () => {
  const expected = String.raw`
Instruction str [0...18)
  Token:3:1 str [0...3)
  Token:3:2 fp [4...6)
  Token:4:0 , [6...7)
  Token:7:0 [ [8...9)
  Token:3:2 sp [9...11)
  Token:4:0 , [11...12)
  Token:6:0 #-4 [13...16)
  Token:8:0 ] [16...17)
  Token:13:0 ! [17...18)`;
  await verifyAstAsync(expected, 'str fp, [sp, #-4]!');
});

test('ldm r4!, {r0, r1, r2, r3}', async () => {
  const expected = String.raw`
Instruction ldm [0...25)
  Token:3:1 ldm [0...3)
  Token:3:2 r4 [4...6)
  Token:13:0 ! [6...7)
  Token:4:0 , [7...8)
  Token:11:0 { [9...10)
  Token:3:2 r0 [10...12)
  Token:4:0 , [12...13)
  Token:3:2 r1 [14...16)
  Token:4:0 , [16...17)
  Token:3:2 r2 [18...20)
  Token:4:0 , [20...21)
  Token:3:2 r3 [22...24)
  Token:12:0 } [24...25)
`;
  await verifyAstAsync(expected, 'ldm r4!, {r0, r1, r2, r3}', A32Set);
});

test('mov R\\reg', async () => {
  const expected =String.raw`
Instruction mov [0...9)
  Token:3:1 mov [0...3)
  Token:3:0 R [4...5)
  Token:0:0 \ [5...6)
  Token:3:0 reg [6...9)
`;
  await verifyAstAsync(expected, 'mov R\\reg', A64Set);
});

test('ADD	X0, X0, A', async () => {
  const expected ="ADD 3:1 [0...3) X0 3:2 [4...6) , 4:0 [6...7) X0 3:2 [8...10) , 4:0 [10...11) A 3:0 [12...13)";
  await verifyAstTokens(expected, 'ADD	X0, X0, A', A64Set);
});