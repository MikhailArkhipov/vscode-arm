// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { Operator } from '../../AST/definitions';
import { TokenType } from '../../tokens/tokens';
import { parseExpression, verifyOperator, verifyTokenNode } from './parseUtility';

test('a+b', () => {
  const result = parseExpression('a+b');
  const exp = result.expression;
  const context = result.context;

  expect(context.errors.count).toBe(0);
  const op = exp.children.getItemAt(0) as Operator;
  expect(op.children.count).toBe(2);

  verifyTokenNode(op.leftOperand, context, TokenType.Symbol, 'a');
  verifyTokenNode(op.rightOperand, context, TokenType.Symbol, 'b');
});

test('a+b*c', () => {
  const result = parseExpression('a+b*c');
  const exp = result.expression;
  const context = result.context;

  expect(context.errors.count).toBe(0);
  const op = exp.children.getItemAt(0) as Operator;
  verifyOperator(op, context, '+');

  expect(op.children.count).toBe(2);
  verifyTokenNode(op.leftOperand, context, TokenType.Symbol, "a")
  verifyTokenNode(op.rightOperand, context, TokenType.Operator, "*")

  expect(op.rightOperand).toBeDefined();
  expect(op.rightOperand!.children.count).toBe(2);
  const multiply = op.rightOperand as Operator;
  verifyOperator(multiply, context, '*');
  
  verifyTokenNode(multiply.leftOperand, context, TokenType.Symbol, "b")
  verifyTokenNode(multiply.rightOperand, context, TokenType.Symbol, "c")
});


