// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TokenNode } from '../../AST/definitions';
import { A32Set } from '../../core/languageOptions';
import { TokenType, TokenSubType } from '../../tokens/definitions';
import { createAstAsync, isTokenNode, makeLanguageOptions } from '../utility/parsing';

test('Get node from position simple', async () => {
  const ast = await createAstAsync(' ADD r1, r2, #123', makeLanguageOptions(A32Set));

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
