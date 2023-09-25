// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TokenType } from '../../tokens/tokens';
import { TestUtil } from '../utility';

test('Empty string', () => {
  const result = TestUtil.tokenizeToArray('');
  expect(result.length).toBe(0);
});

test('Single label', () => {
  const result = TestUtil.tokenizeToArray('label:');
  expect(result.length).toBe(6);
  expect(result.count).toBe(1);
  expect(result.getItemAt(0).type).toBe(TokenType.Label);
});

test('Single instruction', () => {
  const result = TestUtil.tokenizeToArray('ADDS5.I8');
  expect(result.length).toBe(8);
  expect(result.count).toBe(1);
  expect(result.getItemAt(0).type).toBe(TokenType.Symbol);
});

test('Label with instruction', () => {
  const actual = TestUtil.tokenizeToArray('label: B.N');
  expect(actual.length).toBe(10);
  TestUtil.verifyTokenTypes(actual, [TokenType.Label, TokenType.Symbol]);
});

test('Single directive', () => {
  const result = TestUtil.tokenizeToArray('.ascii');
  expect(result.length).toBe(6);
  expect(result.count).toBe(1);
  expect(result.getItemAt(0).type).toBe(TokenType.Directive);
});

test('Strings', () => {
  const actual = TestUtil.tokenizeToArray('\'a b c\' "a b c" #\'a\' #"b"');
  expect(actual.count).toBe(4);
  TestUtil.verifyTokenTypes(actual, [TokenType.String, TokenType.String, TokenType.String, TokenType.String]);
});

test('Single number', () => {
  const result = TestUtil.tokenizeToArray(' #1');
  expect(result.count).toBe(1);
  expect(result.getItemAt(0).type).toBe(TokenType.Number);
});

test('Numbers', () => {
  const actual = TestUtil.tokenizeToArray(' #0xabcD #1 #0x12A');
  TestUtil.verifyTokenTypes(actual, [TokenType.Number, TokenType.Number, TokenType.Number]);
});

test('Malformed numbers', () => {
  const actual = TestUtil.tokenizeToArray(' #0x #ZA #0xZ');
  expect(actual.count).toBe(6);
  TestUtil.verifyTokenTypes(actual, [
    TokenType.Unknown, // #
    TokenType.Unknown, // 0x
    TokenType.Unknown, // #
    TokenType.Symbol, // ZA
    TokenType.Unknown, // #
    TokenType.Unknown, // 0xZ
  ]);
});

test('Label with directive', () => {
  const actual = TestUtil.tokenizeToArray('label: .fill');
  expect(actual.length).toBe(12);
  TestUtil.verifyTokenTypes(actual, [TokenType.Label, TokenType.Directive]);
});

test('Label with instruction no space', () => {
  const actual = TestUtil.tokenizeToArray('label:add');
  expect(actual.length).toBe(9);
  TestUtil.verifyTokenTypes(actual, [TokenType.Label, TokenType.Symbol]);
});

test('Instruction with operands', () => {
  const text = 'add a, b, c';
  const actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TestUtil.verifyTokenTypes(actual, [
    TokenType.Symbol,
    TokenType.Symbol,
    TokenType.Comma,
    TokenType.Symbol,
    TokenType.Comma,
    TokenType.Symbol,
  ]);
});

test('Not a register', () => {
  const text = '2X, R2, R3';
  const actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TestUtil.verifyTokenTypes(actual, [
    TokenType.Unknown,
    TokenType.Comma,
    TokenType.Symbol,
    TokenType.Comma,
    TokenType.Symbol,
  ]);
});

test('Label + instruction with operands', () => {
  const text = 'label: ADD r1, r2, r3 ';
  const actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length - 1);
  TestUtil.verifyTokenTypes(actual, [
    TokenType.Label,
    TokenType.Symbol,
    TokenType.Symbol,
    TokenType.Comma,
    TokenType.Symbol,
    TokenType.Comma,
    TokenType.Symbol,
  ]);
});

test('Label + directive + string', () => {
  const text = 'label: .ascii "a b c"';
  const actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TestUtil.verifyTokenTypes(actual, [TokenType.Label, TokenType.Directive, TokenType.String]);
});

test('Line breaks', () => {
  const text = 'label: .ascii "a b c"\n  ADDS r1, r2, #1\n';
  const actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TestUtil.verifyTokenTypes(actual, [
    TokenType.Label,
    TokenType.Directive,
    TokenType.String,
    TokenType.EndOfLine,
    TokenType.Symbol,
    TokenType.Symbol,
    TokenType.Comma,
    TokenType.Symbol,
    TokenType.Comma,
    TokenType.Number,
    TokenType.EndOfLine,
  ]);
});

test('Hash comments', () => {
  const text = '# comment\nabc';
  const actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TestUtil.verifyTokenTypes(actual, [TokenType.LineComment, TokenType.EndOfLine, TokenType.Symbol]);
});

test('@ comments', () => {
  const text = 'abc @ comment\nabc';
  const actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TestUtil.verifyTokenTypes(actual, [TokenType.Symbol, TokenType.LineComment, TokenType.EndOfLine, TokenType.Symbol]);
});

test('C++ comments', () => {
  const text = 'abc // comment\n// abc';
  const actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TestUtil.verifyTokenTypes(actual, [
    TokenType.Symbol,
    TokenType.LineComment,
    TokenType.EndOfLine,
    TokenType.LineComment,
  ]);
});

test('C block comments 1', () => {
  const text = 'abc /* comment */ def\n/* abc\ndef */ klm\n';
  const actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TestUtil.verifyTokenTypes(actual, [
    TokenType.Symbol,
    TokenType.BlockComment,
    TokenType.Symbol,
    TokenType.EndOfLine,
    TokenType.BlockComment,
    TokenType.Symbol,
    TokenType.EndOfLine,
  ]);
});

test('C block comments 2', () => {
  const text = 'label: /**/ abc /* comment */ def\n/* abc\ndef */ klm\n';
  const actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TestUtil.verifyTokenTypes(actual, [
    TokenType.Label,
    TokenType.BlockComment,
    TokenType.Symbol,
    TokenType.BlockComment,
    TokenType.Symbol,
    TokenType.EndOfLine,
    TokenType.BlockComment,
    TokenType.Symbol,
    TokenType.EndOfLine,
  ]);
});

test('Nested comments 1', () => {
  const text = '// /* comment */ ';
  const actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TestUtil.verifyTokenTypes(actual, [TokenType.LineComment]);
});

test('Nested comments 2', () => {
  const text = '/* // comment */';
  const actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TestUtil.verifyTokenTypes(actual, [TokenType.BlockComment]);
});

test('Unclosed C comment', () => {
  const text = '/* comment \n\n';
  const actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TestUtil.verifyTokenTypes(actual, [TokenType.BlockComment]);
});

test('Not a comment', () => {
  const text = '; not a comment \n\n';
  const actual = TestUtil.tokenizeToArray(text);
  TestUtil.verifyTokenTypes(actual, [
    TokenType.Unknown,
    TokenType.Symbol,
    TokenType.Symbol,
    TokenType.Symbol,
    TokenType.EndOfLine,
  ]);
});

test('EQU directive', () => {
  const text = 'name .equ 1';
  const actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TestUtil.verifyTokenTypes(actual, [TokenType.Symbol, TokenType.Directive, TokenType.Number]);
});

test('ASCII directive', () => {
  const text = '.ascii "string"';
  const actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TestUtil.verifyTokenTypes(actual, [TokenType.Directive, TokenType.String]);
});

test('Unterminated string', () => {
  const text = '"string @ comment';
  const actual = TestUtil.tokenizeToArray(text);
  TestUtil.verifyTokenTypes(actual, [TokenType.String]);
});

test('Expression 1', () => {
  const text = 'a+b';
  const actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TestUtil.verifyTokenTypes(actual, [TokenType.Symbol, TokenType.Operator, TokenType.Symbol]);
});

test('Expression 2', () => {
  const text = 'a +b';
  const actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TestUtil.verifyTokenTypes(actual, [TokenType.Symbol, TokenType.Operator, TokenType.Symbol]);
});

test('Expression 3', () => {
  const text = '2*(a +(b*!_c) >> 17 << x2_1';
  const actual = TestUtil.tokenizeToArray(text);  
  TestUtil.verifyTokenTypes(actual, [
    TokenType.Number, 
    TokenType.Operator,
    TokenType.OpenBrace,
    TokenType.Symbol,
    TokenType.Operator,
    TokenType.OpenBrace,
    TokenType.Symbol,
    TokenType.Operator,
    TokenType.Operator,
    TokenType.Symbol,
    TokenType.CloseBrace,
    TokenType.Operator,
    TokenType.Number,
    TokenType.Operator,
    TokenType.Symbol,
  ]);
});

test('Unknown symbols 1', () => {
  const text = '2_@foo';
  const actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TestUtil.verifyTokenTypes(actual, [TokenType.Number, TokenType.Symbol, TokenType.LineComment]);
});

test('Unknown symbols 2', () => {
  const text = ';;`*';
  const actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TestUtil.verifyTokenTypes(actual, [TokenType.Unknown, TokenType.Operator]);
});