// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TokenType } from '../../tokens/tokens';
import { TokenTest } from '../utility/tokenTest';

test('Empty string', () => {
  const result = TokenTest.tokenizeToArray('');
  expect(result.length).toBe(0);
});

test('Single label', () => {
  const result = TokenTest.tokenizeToArray('label:');
  expect(result.length).toBe(6);
  expect(result.count).toBe(1);
  expect(result.getItemAt(0).type).toBe(TokenType.Label);
});

test('Single instruction', () => {
  const result = TokenTest.tokenizeToArray('ADDS5.I8');
  expect(result.length).toBe(8);
  expect(result.count).toBe(1);
  expect(result.getItemAt(0).type).toBe(TokenType.Symbol);
});

test('Label with instruction', () => {
  const actual = TokenTest.tokenizeToArray('label: B.N');
  expect(actual.length).toBe(10);
  TokenTest.verifyTokenTypes(actual, [TokenType.Label, TokenType.Symbol]);
});

test('Single directive', () => {
  const result = TokenTest.tokenizeToArray('.ascii');
  expect(result.length).toBe(6);
  expect(result.count).toBe(1);
  expect(result.getItemAt(0).type).toBe(TokenType.Directive);
});

test('Strings', () => {
  const actual = TokenTest.tokenizeToArray('\'a b c\' "a b c" #\'a\' #"b"');
  expect(actual.count).toBe(4);
  TokenTest.verifyTokenTypes(actual, [TokenType.String, TokenType.String, TokenType.String, TokenType.String]);
});

test('Single number', () => {
  const result = TokenTest.tokenizeToArray(' #1');
  expect(result.count).toBe(1);
  expect(result.getItemAt(0).type).toBe(TokenType.Number);
});

test('Numbers', () => {
  const actual = TokenTest.tokenizeToArray(' #0xabcD, #1, #0x12A');
  TokenTest.verifyTokenTypes(actual, [
    TokenType.Number,
    TokenType.Comma,
    TokenType.Number,
    TokenType.Comma,
    TokenType.Number,
  ]);
});

test('Malformed numbers', () => {
  const actual = TokenTest.tokenizeToArray(' #0x #ZA #0xZ');
  expect(actual.count).toBe(6);
  TokenTest.verifyTokenTypes(actual, [
    TokenType.Unknown, // #
    TokenType.Unknown, // 0x
    TokenType.Unknown, // #
    TokenType.Symbol, // ZA
    TokenType.Unknown, // #
    TokenType.Unknown, // 0xZ
  ]);
});

test('Label with directive', () => {
  const actual = TokenTest.tokenizeToArray('label: .fill');
  expect(actual.length).toBe(12);
  TokenTest.verifyTokenTypes(actual, [TokenType.Label, TokenType.Directive]);
});

test('Label with instruction no space', () => {
  const actual = TokenTest.tokenizeToArray('label:add');
  expect(actual.length).toBe(9);
  TokenTest.verifyTokenTypes(actual, [TokenType.Label, TokenType.Symbol]);
});

test('Instruction with operands', () => {
  const text = 'add a, b, c';
  const actual = TokenTest.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TokenTest.verifyTokenTypes(actual, [
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
  const actual = TokenTest.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TokenTest.verifyTokenTypes(actual, [
    TokenType.Unknown,
    TokenType.Comma,
    TokenType.Symbol,
    TokenType.Comma,
    TokenType.Symbol,
  ]);
});

test('Label + instruction with operands', () => {
  const text = 'label: ADD r1, r2, r3 ';
  const actual = TokenTest.tokenizeToArray(text);
  expect(actual.length).toBe(text.length - 1);
  TokenTest.verifyTokenTypes(actual, [
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
  const actual = TokenTest.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TokenTest.verifyTokenTypes(actual, [TokenType.Label, TokenType.Directive, TokenType.String]);
});

test('Line breaks', () => {
  const text = 'label: .ascii "a b c"\n  ADDS r1, r2, #1\n';
  const actual = TokenTest.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TokenTest.verifyTokenTypes(actual, [
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
  const actual = TokenTest.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TokenTest.verifyTokenTypes(actual, [TokenType.LineComment, TokenType.EndOfLine, TokenType.Symbol]);
});

test('@ comments', () => {
  const text = 'abc @ comment\nabc';
  const actual = TokenTest.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TokenTest.verifyTokenTypes(actual, [TokenType.Symbol, TokenType.LineComment, TokenType.EndOfLine, TokenType.Symbol]);
});

test('C++ comments', () => {
  const text = 'abc // comment\n// abc';
  const actual = TokenTest.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TokenTest.verifyTokenTypes(actual, [
    TokenType.Symbol,
    TokenType.LineComment,
    TokenType.EndOfLine,
    TokenType.LineComment,
  ]);
});

test('C block comments 1', () => {
  const text = 'abc /* comment */ def\n/* abc\ndef */ klm\n';
  const actual = TokenTest.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TokenTest.verifyTokenTypes(actual, [
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
  const actual = TokenTest.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TokenTest.verifyTokenTypes(actual, [
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
  const actual = TokenTest.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TokenTest.verifyTokenTypes(actual, [TokenType.LineComment]);
});

test('Nested comments 2', () => {
  const text = '/* // comment */';
  const actual = TokenTest.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TokenTest.verifyTokenTypes(actual, [TokenType.BlockComment]);
});

test('Unclosed C comment', () => {
  const text = '/* comment \n\n';
  const actual = TokenTest.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TokenTest.verifyTokenTypes(actual, [TokenType.BlockComment]);
});

test('Not a comment', () => {
  const text = '; not a comment \n\n';
  const actual = TokenTest.tokenizeToArray(text);
  TokenTest.verifyTokenTypes(actual, [
    TokenType.Unknown,
    TokenType.Symbol,
    TokenType.Symbol,
    TokenType.Symbol,
    TokenType.EndOfLine,
    TokenType.EndOfLine,
  ]);
});

test('EQU directive', () => {
  const text = 'name .equ 1';
  const actual = TokenTest.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TokenTest.verifyTokenTypes(actual, [TokenType.Symbol, TokenType.Directive, TokenType.Number]);
});

test('ASCII directive', () => {
  const text = '.ascii "string"';
  const actual = TokenTest.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TokenTest.verifyTokenTypes(actual, [TokenType.Directive, TokenType.String]);
});

test('Unterminated string', () => {
  const text = '"string @ comment';
  const actual = TokenTest.tokenizeToArray(text);
  TokenTest.verifyTokenTypes(actual, [TokenType.String]);
});

test('1+2', () => {
  const text = '1+2';
  const actual = TokenTest.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TokenTest.verifyTokenTypes(actual, [TokenType.Number, TokenType.Operator, TokenType.Number]);
});

test('a+b', () => {
  const text = 'a+b';
  const actual = TokenTest.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TokenTest.verifyTokenTypes(actual, [TokenType.Symbol, TokenType.Operator, TokenType.Symbol]);
});

test('a +b', () => {
  const text = 'a +b';
  const actual = TokenTest.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TokenTest.verifyTokenTypes(actual, [TokenType.Symbol, TokenType.Operator, TokenType.Symbol]);
});

test('2*(a +(b*!_c) >> 17 << x2_1', () => {
  const text = '2*(a +(b*!_c) >> 17 << x2_1';
  const actual = TokenTest.tokenizeToArray(text);
  TokenTest.verifyTokenTypes(actual, [
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

test('((x))+1', () => {
  const text = '((x))+1';
  const actual = TokenTest.tokenizeToArray(text);
  TokenTest.verifyTokenTypes(actual, [
    TokenType.OpenBrace,
    TokenType.OpenBrace,
    TokenType.Symbol,
    TokenType.CloseBrace,
    TokenType.CloseBrace,
    TokenType.Operator,
    TokenType.Number,
  ]);
});

test('2_@foo', () => {
  const text = '2_@foo';
  const actual = TokenTest.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TokenTest.verifyTokenTypes(actual, [TokenType.Number, TokenType.Symbol, TokenType.LineComment]);
});

test(';;`*', () => {
  const text = ';;`*';
  const actual = TokenTest.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  TokenTest.verifyTokenTypes(actual, [TokenType.Unknown, TokenType.Operator]);
});
