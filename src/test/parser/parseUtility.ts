// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { Operator, AstNode, isTokenNode, TokenNode, Expression } from "../../AST/definitions";
import { ExpressionImpl } from "../../AST/expression";
import { ParseContext } from "../../parser/parseContext";
import { TokenType, TokenSubType } from "../../tokens/tokens";
import { TestUtil } from "../utility";

export function verifyOperator(op: Operator, context: ParseContext, expectedOpText: string): void {
  expect(op.children.count).toBe(2);
  verifyTokenNode(op, context, TokenType.Operator, expectedOpText);
}

export function verifyTokenNode(
  n: AstNode | undefined,
  context: ParseContext,
  tokenType: TokenType,
  expectedText: string,
  tokenSubType?: TokenSubType
) {
  expect(isTokenNode(n)).toBe(true);
  const tn = n as TokenNode;
  expect(tn.token.type).toBe(tokenType);
  if (tokenSubType) {
    expect(tn.token.subType).toBe(tokenSubType);
  }
  verifyNodeText(tn, context, expectedText);
}

export function verifyNodeText(n: AstNode, context: ParseContext, expectedText: string): void {
  expect(context.text.getText(n.start, n.length)).toBe(expectedText);
}

export function parseExpression(text: string): { expression: Expression; context: ParseContext } {
  const context = TestUtil.makeParseContext(text);
  const expression = new ExpressionImpl();
  expression.parse(context, context.root);
  return { expression, context };
}