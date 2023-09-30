// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.
import * as path from 'path';
import 'jest-expect-message';

import { AstRootImpl } from '../../AST/astRoot';
import { AstNode, TokenNode, Expression, TokenOperator, AstRoot } from '../../AST/definitions';
import { ExpressionImpl } from '../../AST/expression';
import { LanguageOptions } from '../../core/languageOptions';
import { ParseContext } from '../../parser/parseContext';
import { TextProvider } from '../../text/definitions';
import { TextStream } from '../../text/textStream';
import { TokenType, TokenSubType, Token } from '../../tokens/definitions';
import { Tokenizer } from '../../tokens/tokenizer';
import { AstWriter } from './astWriter';
import { compareLines } from './textCompare';
import { loadInstructionSets } from '../../instructions/instructionSet';
import { Settings } from '../../core/settings';

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

export async function verifyAstAsync(expectedTree: string, text: string, isA64?: boolean): Promise<void> {
  await initInstructionSet(isA64 ?? true);
  const ast = await createAstAsync(text);
  const writer = new AstWriter();
  const actualTree = writer.writeTree(ast, text);
  compareTrees(expectedTree, actualTree);
}

export function verifyParseExpression(expectedTree: string, text: string): void {
  const expression = parseExpression(text).expression;
  const writer = new AstWriter();
  const actualTree = writer.writeTree(expression, text);
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

export async function createAstAsync(text: string, options?: LanguageOptions): Promise<AstRoot> {
  options = options ?? makeLanguageOptions(true);
  await initInstructionSet(options.isA64);
  const t = new Tokenizer(options);
  const tokens = t.tokenize(new TextStream(text), 0, text.length);
  return AstRootImpl.create(text, options, tokens, 0);
}

function makeParseContext(text: string, options?: LanguageOptions): ParseContext {
  options = options ?? makeLanguageOptions(true);
  const t = new Tokenizer(options);
  const ts = new TextStream(text);
  const tokens = t.tokenize(ts, 0, text.length);
  const ast = new AstRootImpl(tokens, 0);
  return new ParseContext(ast, ts, options, tokens);
}
export function writeTokens(filePath: string): void {}

export function makeLanguageOptions(isA64: boolean): LanguageOptions {
  return {
    lineCommentChar: '@', // Line comments start with @
    cLineComments: true, // Allow C++ style line comments i.e. //
    cBlockComments: true, // Allow C block comments /* */
    hashComments: true,
    isA64,
  };
}

async function initInstructionSet(isA64: boolean): Promise<void> {
  const setFolder = path.join(__dirname, '..', '..', 'instruction_sets');
  return loadInstructionSets(setFolder);
}
