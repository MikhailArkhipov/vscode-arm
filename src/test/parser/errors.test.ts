// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseErrorType } from '../../AST/definitions';
import { ParseContext } from '../../parser/parseContext';
import { parseExpression } from './parseUtility';

test('empty', () => {
  const result = parseExpression('');
  expect(result.context.errors.count).toBe(0);
});

test('+', () => {
  const result = parseExpression('+');
  verifyError(result.context, ParseErrorType.RightOperandExpected, 0, 1);
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

function verifyError(context: ParseContext, errorType: ParseErrorType, start: number, length: number): void {
  expect(context.errors.count).toBe(1);
  const e = context.errors.getItemAt(0);
  expect(e.errorType).toBe(errorType);
  expect(e.start).toBe(start);
  expect(e.length).toBe(length);
}