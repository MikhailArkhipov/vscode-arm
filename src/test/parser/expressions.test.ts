// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { Group, TokenOperator } from '../../AST/definitions';
import { TokenType } from '../../tokens/definitions';
import {
  isTokenNode,
  parseExpression,
  verifyAstAsync,
  verifyNodeText,
  verifyOperator,
  verifyParseExpression,
  verifyTokenNode,
} from '../utility/parsing';

test('a+b', () => {
  const result = parseExpression('a+b');
  const exp = result.expression;
  const context = result.context;

  expect(context.errors.length).toBe(0);
  const op = exp.children.getItemAt(0) as TokenOperator;
  expect(op.children.count).toBe(3);

  verifyTokenNode(op.leftOperand, context.text, TokenType.Symbol, 'a');
  verifyTokenNode(op.tokenNode, context.text, TokenType.Operator, '+');
  verifyTokenNode(op.rightOperand, context.text, TokenType.Symbol, 'b');
});

test('a+b*c', () => {
  const result = parseExpression('a+b*c');
  const exp = result.expression;
  const context = result.context;

  expect(context.errors.length).toBe(0);
  const op = exp.children.getItemAt(0) as TokenOperator;
  verifyOperator(op, context.text, '+');

  verifyTokenNode(op.leftOperand, context.text, TokenType.Symbol, 'a');
  verifyOperator(op.rightOperand as TokenOperator, context.text, '*');

  expect(op.rightOperand!.children.count).toBe(3);
  const multiply = op.rightOperand as TokenOperator;
  verifyOperator(multiply, context.text, '*');

  verifyTokenNode(multiply.leftOperand, context.text, TokenType.Symbol, 'b');
  verifyTokenNode(multiply.tokenNode, context.text, TokenType.Operator, '*');
  verifyTokenNode(multiply.rightOperand, context.text, TokenType.Symbol, 'c');
});

test('(a+b)*c', () => {
  const result = parseExpression('(a+b)*c');
  const exp = result.expression;
  const context = result.context;

  expect(context.errors.length).toBe(0);
  const op = exp.children.getItemAt(0) as TokenOperator;
  verifyOperator(op, context.text, '*');

  expect(op.children.count).toBe(3);
  verifyNodeText(op.leftOperand!, context.text, '(a+b)');
  verifyTokenNode(op.rightOperand, context.text, TokenType.Symbol, 'c');

  expect(op.leftOperand!.children.count).toBe(3);
  const g = op.leftOperand as Group;
  expect(isTokenNode(g.openBrace)).toBe(true);
  expect(isTokenNode(g.closeBrace)).toBe(true);
  expect(g.content).toBeDefined();
  verifyNodeText(g.content!, context.text, 'a+b');
});

test('a & !b', () => {
  const expected = String.raw
`Operator a & !b [0...6)
  Token a [0...1)
  Token & [2...3)
  Operator !b [4...6)
    Token ! [4...5)
    Token b [5...6)
`;
  verifyParseExpression(expected, 'a & !b');
});

test('a*b+c*d', () => {
  const expected = String.raw
`Operator a*b+c*d [0...7)
  Operator a*b [0...3)
    Token a [0...1)
    Token * [1...2)
    Token b [2...3)
  Token + [3...4)
  Operator c*d [4...7)
    Token c [4...5)
    Token * [5...6)
    Token d [6...7)
`;
  verifyParseExpression(expected, 'a*b+c*d');
});

test('((x))+1', () => {
  const expected = String.raw
`Operator ((x))+1 [0...7)
  Group [0...5)
    Token ( [0...1)
    Expression [1...4)
      Group [1...4)
        Token ( [1...2)
        Expression [2...3)
          Token x [2...3)
        Token ) [3...4)
    Token ) [4...5)
  Token + [5...6)
  Token 1 [6...7)
`;
  verifyParseExpression(expected, '((x))+1');
});

test('-a', () => {
  const expected = String.raw
`Operator -a [0...2)
  Token - [0...1)
  Token a [1...2)
`;
  verifyParseExpression(expected, '-a');
});

test('-a+b', () => {
  const expected = String.raw
`Operator -a+b [0...4)
  Operator -a [0...2)
    Token - [0...1)
    Token a [1...2)
  Token + [2...3)
  Token b [3...4)
`;
  verifyParseExpression(expected, '-a+b');
});

test('"a"+\'b\'', () => {
  const expected = String.raw
`Operator "a"+'b' [0...7)
  Token "a" [0...3)
  Token + [3...4)
  Token 'b' [4...7)
`;
  verifyParseExpression(expected, '"a"+\'b\'');
});

test('[pc, #-0]', () => {
  const expected = String.raw
`CommaSeparatedList [0...9)
  Token [ [0...1)
  CommaSeparatedItem [1...4)
    Expression [1...3)
      Token pc [1...3)
    Token , [3...4)
  CommaSeparatedItem [5...8)
    Expression [5...8)
      Token #-0 [5...8)
  Token ] [8...9)
`;
  verifyParseExpression(expected, '[pc, #-0]');
});

test('{pc}+8', () => {
  const expected = String.raw
`Operator {pc}+8 [0...6)
  CommaSeparatedList [0...4)
    Token { [0...1)
    CommaSeparatedItem [1...3)
      Expression [1...3)
        Token pc [1...3)
    Token } [3...4)
  Token + [4...5)
  Token 8 [5...6)
`;
  verifyParseExpression(expected, '{pc}+8');
});

test('x4!', () => {
  const expected = String.raw
`Token x4 [0...2)
`;
  verifyParseExpression(expected, 'x4!');
});

test('[x4, 1]!', () => {
  const expected = String.raw
`CommaSeparatedList [0...7)
  Token [ [0...1)
  CommaSeparatedItem [1...4)
    Expression [1...3)
      Token x4 [1...3)
    Token , [3...4)
  CommaSeparatedItem [5...6)
    Expression [5...6)
      Token 1 [5...6)
  Token ] [6...7)
`;
  verifyParseExpression(expected, '[x4, 1]!');
});

test('=[x4, 1]', () => {
  const expected = String.raw
`CommaSeparatedList [0...7)
  Token [ [0...1)
  CommaSeparatedItem [1...4)
    Expression [1...3)
      Token x4 [1...3)
    Token , [3...4)
  CommaSeparatedItem [5...6)
    Expression [5...6)
      Token 1 [5...6)
  Token ] [6...7)
`;
  verifyParseExpression(expected, '[x4, 1]!');
})

test('{pc}caret', () => {
  const expected = String.raw
`CommaSeparatedList [0...4)
  Token { [0...1)
  CommaSeparatedItem [1...3)
    Expression [1...3)
      Token pc [1...3)
  Token } [3...4)
`;
  verifyParseExpression(expected, '{pc}^');
})

test('ldr r0, =1f', async () => {
  const code = String.raw`
  .macro x
    ldr r0, =1f
  `;
  const expected = String.raw
`EmptyStatement [0...0)
MacroDirectiveStatement [3...11)
  Token .macro [3...9)
  Token x [10...11)
InstructionStatement [16...27)
  Token ldr [16...19)
  CommaSeparatedList [20...27)
    CommaSeparatedItem [20...23)
      Expression [20...22)
        Token r0 [20...22)
      Token , [22...23)
    CommaSeparatedItem [25...27)
      Expression [25...27)
        Token 1f [25...27)
`;
  await verifyAstAsync(expected, code, false);
})

test('a: .asciz	"a"', async () => {
  const code = String.raw`a: .asciz	"a"`;
  const expected = String.raw
`DeclarationStatement [3...13)
  Token .asciz [3...9)
  CommaSeparatedList [10...13)
    CommaSeparatedItem [10...13)
      Expression [10...13)
        Token "a" [10...13)
`;
  await verifyAstAsync(expected, code, false);
})