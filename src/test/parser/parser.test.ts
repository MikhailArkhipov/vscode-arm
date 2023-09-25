// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { Statement } from '../../AST/statement';
import { TestUtil } from '../../test/utility';
import { AstNode, CommaSeparatedItem, CommaSeparatedList, Expression, Operator, TokenNode } from '../../AST/definitions';
import { ErrorLocation, ParseErrorType } from '../../parser/parseError';
import { TokenSubType, TokenType } from '../../tokens/tokens';

test('Empty string', () => {
  const root = TestUtil.parseText('');
  expect(root).toBeDefined();
  expect(root.children.count).toBe(0);
  expect(root.parent).toBe(root);
});

test('Simple expression', () => {
  const root = TestUtil.parseText('a+b');
  let child: AstNode;

  expect(root).toBeDefined();
  expect(root.children.count).toBe(1);

  expect(root.context.errors.count).toBe(1);
  const e = root.context.errors.getItemAt(0);
  expect(e.errorType).toBe(ParseErrorType.InstructionOrDirectiveExpected);
  expect(e.location).toBe(ErrorLocation.Token);
  expect(e.start).toBe(0);
  expect(e.length).toBe(1);
  const c1 = root.children.getItemAt(0);
  expect(c1).toBeInstanceOf(Statement);

  const s = c1 as Statement;
  expect(s.children.count).toBe(1);
  child = s.children.getItemAt(0);
  
  const csl = child as CommaSeparatedList;
  expect(csl.children.count).toBe(1);
  child = csl.children.getItemAt(0);
  
  const csi = child as CommaSeparatedItem;
  expect(csi.children.count).toBe(1);
  child = csi.children.getItemAt(0);
  
  const exp = child as Expression;
  expect(exp.children.count).toBe(1);
  child = exp.children.getItemAt(0);
  
  const op = child as Operator;
  expect(op.children.count).toBe(2);

  expect(root.text.getText(op.leftOperand!.start, op.leftOperand!.length)).toBe('a');
  expect(root.text.getText(op.rightOperand!.start, op.rightOperand!.length)).toBe('b');
});

test('Simple instruction', () => {
    const root = TestUtil.parseText('add r1, r2, #1');
    let child: AstNode;
  
    expect(root).toBeDefined();
    expect(root.children.count).toBe(1);
  
    expect(root.context.errors.count).toBe(0);
    const c1 = root.children.getItemAt(0);
    expect(c1).toBeInstanceOf(Statement);
  
    const s = c1 as Statement;
    expect(s.children.count).toBe(1);
    child = s.children.getItemAt(0);
    let tn = child as TokenNode;
    TestUtil.verifyNodeText(root.text, tn, "add");
    TestUtil.verifyNodeTokenType(tn, TokenType.Symbol, TokenSubType.Instruction);
  
    const csl = child as CommaSeparatedList;
    expect(csl.children.count).toBe(1);
    child = csl.children.getItemAt(0);
  
    const csi = child as CommaSeparatedItem;
    expect(csi.children.count).toBe(1);
    child = csi.children.getItemAt(0);
  
    const e = child as Expression;
    expect(e.children.count).toBe(1);
    child = e.children.getItemAt(0);
    tn = child as TokenNode;
    TestUtil.verifyNodeText(root.text, tn, "r1");
    TestUtil.verifyNodeTokenType(tn, TokenType.Symbol, TokenSubType.Register);
  
    const op = child as Operator;
    expect(op.children.count).toBe(2);
  
    expect(root.text.getText(op.leftOperand!.start, op.leftOperand!.length)).toBe('a');
    expect(root.text.getText(op.rightOperand!.start, op.rightOperand!.length)).toBe('b');
  });
  