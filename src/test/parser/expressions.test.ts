// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { Group, TokenOperator } from '../../AST/definitions';
import { TokenType } from '../../tokens/tokens';
import {
  isTokenNode,
  parseExpression,
  verifyNodeText,
  verifyOperator,
  verifyParseExpression,
  verifyTokenNode,
} from '../utility/parsing';

test('a+b', () => {
  const result = parseExpression('a+b');
  const exp = result.expression;
  const context = result.context;

  expect(context.errors.count).toBe(0);
  const op = exp.children.getItemAt(0) as TokenOperator;
  expect(op.children.count).toBe(3);

  verifyTokenNode(op.leftOperand, context, TokenType.Symbol, 'a');
  verifyTokenNode(op.tokenNode, context, TokenType.Operator, '+');
  verifyTokenNode(op.rightOperand, context, TokenType.Symbol, 'b');
});

test('a+b*c', () => {
  const result = parseExpression('a+b*c');
  const exp = result.expression;
  const context = result.context;

  expect(context.errors.count).toBe(0);
  const op = exp.children.getItemAt(0) as TokenOperator;
  verifyOperator(op, context, '+');

  verifyTokenNode(op.leftOperand, context, TokenType.Symbol, 'a');
  verifyOperator(op.rightOperand as TokenOperator, context, '*');

  expect(op.rightOperand!.children.count).toBe(3);
  const multiply = op.rightOperand as TokenOperator;
  verifyOperator(multiply, context, '*');

  verifyTokenNode(multiply.leftOperand, context, TokenType.Symbol, 'b');
  verifyTokenNode(multiply.tokenNode, context, TokenType.Operator, '*');
  verifyTokenNode(multiply.rightOperand, context, TokenType.Symbol, 'c');
});

test('(a+b)*c', () => {
  const result = parseExpression('(a+b)*c');
  const exp = result.expression;
  const context = result.context;

  expect(context.errors.count).toBe(0);
  const op = exp.children.getItemAt(0) as TokenOperator;
  verifyOperator(op, context, '*');

  expect(op.children.count).toBe(3);
  verifyNodeText(op.leftOperand!, context, '(a+b)');
  verifyTokenNode(op.rightOperand, context, TokenType.Symbol, 'c');

  expect(op.leftOperand!.children.count).toBe(3);
  const g = op.leftOperand as Group;
  expect(isTokenNode(g.openBrace)).toBe(true);
  expect(isTokenNode(g.closeBrace)).toBe(true);
  expect(g.content).toBeDefined();
  verifyNodeText(g.content!, context, 'a+b');
});

test('a & !b', () => {
  const expected = 
String.raw`TokenOperator [0...6)
  TokenNode [0...1)
  TokenNode [2...3)
  TokenOperator [4...6)
    TokenNode [4...5)
    TokenNode [5...6)
`;
  verifyParseExpression(expected, 'a & !b');
});

test('a*b+c*d', () => {
  const expected = 
String.raw`TokenOperator [0...7)
  TokenOperator [0...3)
    TokenNode [0...1)
    TokenNode [1...2)
    TokenNode [2...3)
  TokenNode [3...4)
  TokenOperator [4...7)
    TokenNode [4...5)
    TokenNode [5...6)
    TokenNode [6...7)
`;
  verifyParseExpression(expected, 'a*b+c*d');
});

test('((x))+1', () => {
  const expected = 
String.raw`TokenOperator [0...7)
  Group [0...5)
    TokenNode [0...1)
    Expression [1...4)
      Group [1...4)
        TokenNode [1...2)
        Expression [2...3)
          TokenNode [2...3)
        TokenNode [3...4)
    TokenNode [4...5)
  TokenNode [5...6)
  TokenNode [6...7)
`;
  verifyParseExpression(expected, '((x))+1');
});

test('-a', () => {
  const expected = 
String.raw`TokenOperator [0...2)
  TokenNode [0...1)
  TokenNode [1...2)
`;
  verifyParseExpression(expected, '-a');
});

test('-a+b', () => {
  const expected = 
String.raw`TokenOperator [0...4)
  TokenOperator [0...2)
    TokenNode [0...1)
    TokenNode [1...2)
  TokenNode [2...3)
  TokenNode [3...4)
`;
  verifyParseExpression(expected, '-a+b');
});

test('"a"+\'b\'', () => {
  const expected = 
String.raw`TokenOperator [0...7)
  TokenNode [0...3)
  TokenNode [3...4)
  TokenNode [4...7)
`;
  verifyParseExpression(expected, '"a"+\'b\'');
});