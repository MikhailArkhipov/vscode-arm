// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import {
  Expression,
  Operator,
  isTokenNode,
  TokenNode,
} from '../../AST/definitions';
import { ExpressionImpl } from '../../AST/expression';
import { ParseContext } from '../../parser/parseContext';
import { TokenType } from '../../tokens/tokens';
import { TestUtil } from '../utility';

test('Simple expression', () => {
  const result = parseExpression('a+b');
  const exp = result.expression;
  const context = result.context;

  expect(context.errors.count).toBe(0);
  const op = exp.children.getItemAt(0) as Operator;
  expect(op.children.count).toBe(2);
  
  const left = op.leftOperand;
  expect(isTokenNode(left)).toBe(true);
  expect((left as TokenNode).token.type).toBe(TokenType.Symbol);

  const right = op.rightOperand;
  expect(isTokenNode(right)).toBe(true);
  expect((right as TokenNode).token.type).toBe(TokenType.Symbol);

  expect(context.text.getText(left!.start, left!.length)).toBe('a');
  expect(context.text.getText(right!.start, right!.length)).toBe('b');
});

function parseExpression(text: string): { expression: Expression; context: ParseContext } {
  const context = TestUtil.makeParseContext(text);
  const expression = new ExpressionImpl();
  expression.parse(context, context.root);
  return { expression, context };
}
