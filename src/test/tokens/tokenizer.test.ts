// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextRangeCollection } from "../../text/textRangeCollection";
import { Token, TokenType } from "../../tokens/tokens";
import { TestUtil } from "../utility";

test("Tokenize empty string", () => {
  var result = TestUtil.tokenizeToString("");
  expect(result.length).toBe(0);
});

test("Tokenize single label", () => {
  var result = TestUtil.tokenizeToArray("label:");
  expect(result.length).toBe(6);
  expect(result.count).toBe(1);
  expect(result.getItemAt(0).tokenType).toBe(TokenType.Word);
});

test("Tokenize single instruction", () => {
  var result = TestUtil.tokenizeToArray("ADDS5.I8");
  expect(result.length).toBe(8);
  expect(result.count).toBe(1);
  expect(result.getItemAt(0).tokenType).toBe(TokenType.Word);
});

test("Tokenize label with instruction", () => {
  var actual = TestUtil.tokenizeToArray("label: B.N");
  expect(actual.length).toBe(10);
  verifyTokenTypes(actual, [TokenType.Word, TokenType.Word]);
});

test("Tokenize comma", () => {
  var text = "a, b, c";
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  verifyTokenTypes(actual, [TokenType.Word, TokenType.Comma, TokenType.Word, TokenType.Comma, TokenType.Word]);
});

test("Tokenize instruction with operands", () => {
  var text = "label: ADD r1, r2, r3 ";
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length - 1);
  verifyTokenTypes(actual, [
    TokenType.Word,
    TokenType.Word,
    TokenType.Word,
    TokenType.Comma,
    TokenType.Word,
    TokenType.Comma,
    TokenType.Word,
  ]);
});

test("Tokenize string", () => {
  var text = 'label: .ascii "a b c"';
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  verifyTokenTypes(actual, [TokenType.Word, TokenType.Word, TokenType.String]);
});

test("Tokenize line breaks", () => {
  var text = 'label: .ascii "a b c"\n  ADDS r1, r2, #1\n';
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  verifyTokenTypes(actual, [
    TokenType.Word,
    TokenType.Word,
    TokenType.String,
    TokenType.EndOfLine,
    TokenType.Word,
    TokenType.Word,
    TokenType.Comma,
    TokenType.Word,
    TokenType.Comma,
    TokenType.Word,
    TokenType.EndOfLine,
  ]);
});

test("Tokenize hash comments", () => {
  var text = "# comment\nabc";
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  verifyTokenTypes(actual, [TokenType.Comment, TokenType.EndOfLine, TokenType.Word]);
});

test("Tokenize @ comments", () => {
  var text = "abc @ comment\nabc";
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  verifyTokenTypes(actual, [TokenType.Word, TokenType.Comment, TokenType.EndOfLine, TokenType.Word]);
});

test("Tokenize C++ comments", () => {
  var text = "abc // comment\n// abc";
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  verifyTokenTypes(actual, [TokenType.Word, TokenType.Comment, TokenType.EndOfLine, TokenType.Comment]);
});

test("Tokenize C block comments", () => {
  var text = "abc /* comment */ def\n/* abc\ndef */ klm\n";
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  verifyTokenTypes(actual, [
    TokenType.Word, TokenType.Comment, TokenType.Word, TokenType.EndOfLine, 
    TokenType.Comment, TokenType.Word, TokenType.EndOfLine]);
});

test("Tokenize nested comments 1", () => {
  var text = "// /* comment */ ";
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  verifyTokenTypes(actual, [TokenType.Comment]);
});

test("Tokenize nested comments 2", () => {
  var text = "/* // comment */";
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  verifyTokenTypes(actual, [TokenType.Comment]);
});

test("Tokenize unclosed C comment", () => {
  var text = "/* comment \n\n";
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  verifyTokenTypes(actual, [TokenType.Comment]);
});

function verifyTokenTypes(actual: TextRangeCollection<Token>, expected: TokenType[]): void {
  expect(actual.count).toBe(expected.length);
  for (var i = 0; i < actual.count; i++) {
    expect(actual.getItemAt(i).tokenType).toBe(expected[i]);
  }
}