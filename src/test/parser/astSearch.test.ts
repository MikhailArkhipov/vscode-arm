// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TokenNode } from '../../AST/definitions';
import { TokenSubType, TokenType } from '../../tokens/tokens';
import { TestUtil } from '../utility';
import { isTokenNode } from './parseUtility';

test('Get node from position simple', () => {
  const ast = TestUtil.parseText(' ADD r1, r2, #123', TestUtil.makeLanguageOptions(false, true));

  let node = ast.nodeFromPosition(0);
  expect(node).toBeUndefined();

  node = ast.nodeFromPosition(1);
  expect(isTokenNode(node)).toBe(true);
  let tn = node as TokenNode;
  expect(tn.token.type).toBe(TokenType.Symbol);
  expect(tn.token.subType).toBe(TokenSubType.Instruction);

  node = ast.nodeFromPosition(6);
  expect(isTokenNode(node)).toBe(true);
  tn = node as TokenNode;
  expect(tn.token.type).toBe(TokenType.Symbol);
  expect(tn.token.subType).toBe(TokenSubType.Register);

  node = ast.nodeFromPosition(15);
  expect(isTokenNode(node)).toBe(true);
  tn = node as TokenNode;
  expect(tn.token.type).toBe(TokenType.Number);
});
