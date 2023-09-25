// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TokenNode } from "../../AST/definitions";
import { TokenType } from "../../tokens/tokens";
import { TestUtil } from "../utility";

test('Get node from position simple', () => {
  const ast = TestUtil.parseText(' ADD r1, r2, #123');

  let node = ast.nodeFromPosition(0);
  expect(node).toBeUndefined();

  node = ast.nodeFromPosition(1);
  let tn = node as TokenNode;
  expect(tn.token.type).toBe(TokenType.Symbol);

  node = ast.nodeFromPosition(4);
  expect(node).toBeUndefined();

  node = ast.nodeFromPosition(6);
  tn = node as TokenNode;
  expect(tn.token.type).toBe(TokenType.Symbol);

  node = ast.nodeFromPosition(15);
  tn = node as TokenNode;
  expect(tn.token.type).toBe(TokenType.Number);
});
