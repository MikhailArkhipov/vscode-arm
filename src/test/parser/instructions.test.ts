// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { AstNode, CommaSeparatedItem, CommaSeparatedList, Expression, Statement, TokenNode } from "../../AST/definitions";
import { TokenSubType, TokenType } from "../../tokens/tokens";
import { TestUtil } from "../utility";

test('Simple A32 instruction', () => {
  const root = TestUtil.parseText('add r1, r2, #1', TestUtil.makeLanguageOptions(false, true));
  let child: AstNode;

  expect(root).toBeDefined();
  expect(root.children.count).toBe(1);

  expect(root.context.errors.count).toBe(0);
  const c1 = root.children.getItemAt(0);

  const s = c1 as Statement;
  expect(s.children.count).toBe(2); // name and list of operands
  child = s.children.getItemAt(0);
  let tn = child as TokenNode;
  TestUtil.verifyNodeText(root.text, tn, "add");
  TestUtil.verifyNodeTokenType(tn, TokenType.Symbol, TokenSubType.Instruction);

  const csl =  s.children.getItemAt(1) as CommaSeparatedList;
  expect(csl.children.count).toBe(3);
  child = csl.children.getItemAt(0);

  const csi = child as CommaSeparatedItem;
  expect(csi.children.count).toBe(2); // Expression and comma
  child = csi.children.getItemAt(0);

  const e = child as Expression;
  expect(e.children.count).toBe(1);
  child = e.children.getItemAt(0);
  tn = child as TokenNode;
  TestUtil.verifyNodeText(root.text, tn, "r1");
  TestUtil.verifyNodeTokenType(tn, TokenType.Symbol, TokenSubType.Register); 
});
