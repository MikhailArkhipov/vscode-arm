// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.
import 'jest-expect-message';
import { AstRootImpl } from '../../AST/astRoot';
import { AstNode, TokenNode, Expression, TokenOperator, AstRoot } from '../../AST/definitions';
import { ExpressionImpl } from '../../AST/expression';
import { LanguageOptions } from '../../core/languageOptions';
import { ParseContext } from '../../parser/parseContext';
import { TextStream } from '../../text/textStream';
import { Tokenizer } from '../../tokens/tokenizer';
import { TokenType, TokenSubType, Token } from '../../tokens/tokens';
import { AstWriter } from './astWriter';
import { compareLines } from './textCompare';

export function verifyOperator(op: TokenOperator, context: ParseContext, expectedOpText: string): void {
  expect(op.children.count).toBe(3); // left operand, token, right operand
  verifyTokenNode(op.tokenNode, context, TokenType.Operator, expectedOpText);
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

export function isTokenNode(node: AstNode | undefined): node is TokenNode {
  const tn = node as TokenNode;
  return tn && tn.token !== undefined;
}

export function verifyToken(token: Token, context: ParseContext, expectedType: TokenType, expectedText: string): void {
  expect(token.type).toBe(expectedType);
  expect(context.text.getText(token.start, token.length)).toBe(expectedText);
}

export function verifyParse(expectedTree: string, text: string): void {
  const ast = parseText(text);
  const writer = new AstWriter();
  const actualTree = writer.writeTree(ast);
  compareTrees(expectedTree, actualTree);
}

export function verifyParseExpression(expectedTree: string, text: string): void {
  const expression = parseExpression(text).expression;
  const writer = new AstWriter();
  const actualTree = writer.writeTree(expression);
  compareTrees(expectedTree, actualTree);
}

function compareTrees(expectedTree: string, actualTree: string): void {
  const result = compareLines(expectedTree, actualTree);
  const message =
    result.lineNumber >= 0
      ? `Line at ${result.lineNumber} should be ${result.expectedLine}, but found ${result.actualLine}, different at position ${result.index}`
      : '';
  expect(result.lineNumber, message).toBe(-1);
}

export function parseExpression(text: string): { expression: Expression; context: ParseContext } {
  const context = makeParseContext(text);
  const expression = new ExpressionImpl();
  expression.parse(context, context.root);
  return { expression, context };
}

export function parseText(text: string, options?: LanguageOptions): AstRoot {
  options = options ?? makeLanguageOptions(true, true);
  const t = new Tokenizer(options);
  const tokens = t.tokenize(new TextStream(text), 0, text.length);
  return AstRootImpl.create(text, options, tokens, 0);
}

export function makeParseContext(text: string, options?: LanguageOptions): ParseContext {
  options = options ?? makeLanguageOptions(true, true);
  const t = new Tokenizer(options);
  const ts = new TextStream(text);
  const tokens = t.tokenize(ts, 0, text.length);
  const ast = new AstRootImpl();
  return new ParseContext(ast, ts, options, tokens, 0);
}
export function writeTokens(filePath: string): void {}

export function makeLanguageOptions(isA64: boolean, reservedRegisterNames: true): LanguageOptions {
  return {
    lineCommentChar: '@', // Line comments start with @
    cLineComments: true, // Allow C++ style line comments i.e. //
    cBlockComments: true, // Allow C block comments /* */
    hashComments: true,
    colonInLabels: true,
    reservedRegisterNames,
    isA64,
  };
}
