// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.
import 'jest-expect-message';

import { AstRootImpl } from '../../AST/astRoot';
import { AstNode, TokenNode, TokenOperator, AstRoot } from '../../AST/definitions';
import { TextProvider } from '../../text/definitions';
import { TextStream } from '../../text/textStream';
import { TokenType, TokenSubType, Token, A64Set } from '../../tokens/definitions';
import { Tokenizer } from '../../tokens/tokenizer';
import { AstWriter, writeAstTokens } from './astWriter';
import { compareLines } from './textCompare';

export function verifyOperator(op: TokenOperator, docText: TextProvider, expectedOpText: string): void {
  expect(op.children.count).toBe(3); // left operand, token, right operand
  verifyTokenNode(op.tokenNode, docText, TokenType.Operator, expectedOpText);
}

export function verifyTokenNode(
  n: AstNode | undefined,
  docText: TextProvider,
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
  verifyNodeText(tn, docText, expectedText);
}

export function verifyNodeText(n: AstNode, docText: TextProvider, expectedText: string): void {
  expect(docText.getText(n.start, n.length)).toBe(expectedText);
}

export function isTokenNode(node: AstNode | undefined): node is TokenNode {
  const tn = node as TokenNode;
  return tn && tn.token !== undefined;
}

export function verifyToken(token: Token, docText: TextProvider, expectedType: TokenType, expectedText: string): void {
  expect(token.type).toBe(expectedType);
  expect(docText.getText(token.start, token.length)).toBe(expectedText);
}

export function verifyAst(expectedTree: string, text: string, instructionSet = A64Set): void {
  const ast = createAst(text, instructionSet);
  expect(ast.errors.length, 'Unexpected parsing errors.').toBe(0);
  const writer = new AstWriter();
  const actualTree = writer.writeTree(ast);
  compareTrees(expectedTree, actualTree);
}

export function verifyAstTokens(expectedTokens: string, text: string, instructionSet = A64Set): void {
  const ast = createAst(text, instructionSet);
  const actual = writeAstTokens(ast, text);
  expect(actual).toBe(expectedTokens);
}

function compareTrees(expectedTree: string, actualTree: string): void {
  const result = compareLines(expectedTree, actualTree);
  const message =
    result.lineNumber >= 0
      ? `Line at ${result.lineNumber} should be ${result.expectedLine}, but found ${result.actualLine}, different at position ${result.index}`
      : '';
  expect(result.lineNumber, message).toBe(-1);
}

export function createAst(text: string, instructionSet = A64Set): AstRoot {
  const t = new Tokenizer(instructionSet);
  const tokens = t.tokenize(new TextStream(text));
  return AstRootImpl.create(text, instructionSet, tokens, 0);
}
