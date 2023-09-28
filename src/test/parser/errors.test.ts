// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseErrorType } from '../../AST/definitions';
import { ParseContext } from '../../parser/parseContext';
import { parseExpression } from '../utility/parsing';

test('empty', () => {
  const result = parseExpression('');
  expect(result.context.errors.count).toBe(0);
});

test('+', () => {
  const result = parseExpression('+');
  verifyError(result.context, ParseErrorType.LeftOperandExpected, 0, 1);
});

test('x+', () => {
  const result = parseExpression('x+');
  verifyError(result.context, ParseErrorType.RightOperandExpected, 1, 1);
});

test('a b', () => {
  const result = parseExpression('a b');
  verifyError(result.context, ParseErrorType.OperatorExpected, 2, 1);
});

test('(', () => {
  const result = parseExpression('(');
  verifyError(result.context, ParseErrorType.CloseBraceExpected, 0, 1);
});

test('((x)', () => {
  const result = parseExpression('((x)');
  verifyError(result.context, ParseErrorType.CloseBraceExpected, 3, 1);
});

test('(x+', () => {
  const result = parseExpression('(x+');
  verifyErrors(result.context, [
    { errorType: ParseErrorType.RightOperandExpected, start: 2, length: 1 },
    { errorType: ParseErrorType.CloseBraceExpected, start: 2, length: 1 },
  ]);
});

test('(a+b)+)', () => {
  const result = parseExpression('(a+b)+)');
  verifyError(result.context, ParseErrorType.RightOperandExpected, 6, 1);
});

test('a()b', () => {
  const result = parseExpression('a()b');
  verifyError(result.context, ParseErrorType.OperatorExpected, 1, 1);
});

test('a - ---', () => {
  const result = parseExpression('a - ---');
  verifyError(result.context, ParseErrorType.LeftOperandExpected, 6, 1);
});

test('{', () => {
  const result = parseExpression('{');
  verifyError(result.context, ParseErrorType.CloseBraceExpected, 0, 1);
});

test('[', () => {
  const result = parseExpression('[');
  verifyError(result.context, ParseErrorType.CloseBraceExpected, 0, 1);
});

test('{}', () => {
  const result = parseExpression('{}');
  verifyError(result.context, ParseErrorType.EmptyExpression, 1, 1);
});

test('[]', () => {
  const result = parseExpression('[]');
  verifyError(result.context, ParseErrorType.EmptyExpression, 1, 1);
});
test('[sp, [1]]', () => {
  const result = parseExpression('[sp, [1]]');
  verifyError(result.context, ParseErrorType.UnexpectedToken, 5, 1);
});

function verifyError(context: ParseContext, errorType: ParseErrorType, start: number, length: number): void {
  expect(context.errors.count).toBe(1);
  const e = context.errors.getItemAt(0);
  expect(e.errorType).toBe(errorType);
  expect(e.start).toBe(start);
  expect(e.length).toBe(length);
}

function verifyErrors(
  context: ParseContext,
  expectedErrors: { errorType: ParseErrorType; start: number; length: number }[]
): void {
  expect(context.errors.count).toBe(expectedErrors.length);
  for (let i = 0; i < expectedErrors.length; i++) {
    const e = context.errors.getItemAt(i);
    expect(e.errorType).toBe(expectedErrors[i].errorType);
    expect(e.start).toBe(expectedErrors[i].start);
    expect(e.length).toBe(expectedErrors[i].length);
  }
}
