// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import {
  AstNode,
  CommaSeparatedItem,
  CommaSeparatedList,
  Expression,
  Statement,
  TokenNode,
} from '../../AST/definitions';
import { TokenSubType, TokenType } from '../../tokens/definitions';
import { createAstAsync, makeLanguageOptions, verifyAstAsync as verifyAstAsync, verifyTokenNode } from '../utility/parsing';

test('Simple A32 instruction', async () => {
  const root = await createAstAsync('add r1, r2, #1', makeLanguageOptions(false));
  let child: AstNode;

  expect(root).toBeDefined();
  expect(root.children.count).toBe(1);

  expect(root.errors.length).toBe(0);
  const c1 = root.children.getItemAt(0);

  const s = c1 as Statement;
  expect(s.children.count).toBe(2); // name and list of operands
  child = s.children.getItemAt(0);
  let tn = child as TokenNode;
  verifyTokenNode(tn, root.text, TokenType.Symbol, 'add', TokenSubType.Instruction);

  const csl = s.children.getItemAt(1) as CommaSeparatedList;
  expect(csl.children.count).toBe(3);
  child = csl.children.getItemAt(0);

  const csi = child as CommaSeparatedItem;
  expect(csi.children.count).toBe(2); // Expression and comma
  child = csi.children.getItemAt(0);

  const e = child as Expression;
  expect(e.children.count).toBe(1);
  child = e.children.getItemAt(0);
  tn = child as TokenNode;
  verifyTokenNode(tn, root.text, TokenType.Symbol, 'r1', TokenSubType.Register);
});

test('str fp, [sp, #-4]!', async () => {
  const expected = String.raw`InstructionStatement [0...17)
  Token str [0...3)
  CommaSeparatedList [4...17)
    CommaSeparatedItem [4...7)
      Expression [4...6)
        Token fp [4...6)
      Token , [6...7)
    CommaSeparatedItem [8...17)
      Expression [8...17)
        CommaSeparatedList [8...17)
          Token [ [8...9)
          CommaSeparatedItem [9...12)
            Expression [9...11)
              Token sp [9...11)
            Token , [11...12)
          CommaSeparatedItem [13...16)
            Expression [13...16)
              Token #-4 [13...16)
          Token ] [16...17)
`;
  await verifyAstAsync(expected, 'str fp, [sp, #-4]!');
});

test('ldm r4!, {r0, r1, r2, r3}', async () => {
  const expected = String.raw`InstructionStatement [0...25)
  Token ldm [0...3)
  CommaSeparatedList [7...25)
    CommaSeparatedItem [7...8)
      Token , [7...8)
    CommaSeparatedItem [9...25)
      Expression [9...25)
        CommaSeparatedList [9...25)
          Token { [9...10)
          CommaSeparatedItem [10...13)
            Expression [10...12)
              Token r0 [10...12)
            Token , [12...13)
          CommaSeparatedItem [14...17)
            Expression [14...16)
              Token r1 [14...16)
            Token , [16...17)
          CommaSeparatedItem [18...21)
            Expression [18...20)
              Token r2 [18...20)
            Token , [20...21)
          CommaSeparatedItem [22...24)
            Expression [22...24)
              Token r3 [22...24)
          Token } [24...25)
`;
  await verifyAstAsync(expected, 'ldm r4!, {r0, r1, r2, r3}', false);
});
