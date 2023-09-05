// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextRangeCollection } from "../../text/textRangeCollection";
import { Token, TokenType } from "../../tokens/tokens";
import { TestUtil } from "../utility";

test("Empty string", () => {
  var result = TestUtil.tokenizeToString("");
  expect(result.length).toBe(0);
});

test("Single label", () => {
  var result = TestUtil.tokenizeToArray("label:");
  expect(result.length).toBe(6);
  expect(result.count).toBe(1);
  expect(result.getItemAt(0).tokenType).toBe(TokenType.Label);
});

test("Single instruction", () => {
  var result = TestUtil.tokenizeToArray("ADDS5.I8");
  expect(result.length).toBe(8);
  expect(result.count).toBe(1);
  expect(result.getItemAt(0).tokenType).toBe(TokenType.Instruction);
});

test("Label with instruction", () => {
  var actual = TestUtil.tokenizeToArray("label: B.N");
  expect(actual.length).toBe(10);
  verifyTokenTypes(actual, [TokenType.Label, TokenType.Instruction]);
});

test("Single directive", () => {
  var result = TestUtil.tokenizeToArray(".ascii");
  expect(result.length).toBe(6);
  expect(result.count).toBe(1);
  expect(result.getItemAt(0).tokenType).toBe(TokenType.Directive);
});

test("Label with directive", () => {
  var actual = TestUtil.tokenizeToArray("label: .fill");
  expect(actual.length).toBe(12);
  verifyTokenTypes(actual, [TokenType.Label, TokenType.Directive]);
});

test("Label with instruction no space", () => {
  var actual = TestUtil.tokenizeToArray("label:add");
  expect(actual.length).toBe(9);
  verifyTokenTypes(actual, [TokenType.Label, TokenType.Instruction]);
});

test("Instruction with operands", () => {
  var text = "add a, b, c";
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  verifyTokenTypes(actual, [
    TokenType.Instruction,
    TokenType.Sequence,
    TokenType.Comma,
    TokenType.Sequence,
    TokenType.Comma,
    TokenType.Sequence,
  ]);
});

test("Label + instruction with operands", () => {
  var text = "label: ADD r1, r2, r3 ";
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length - 1);
  verifyTokenTypes(actual, [
    TokenType.Label,
    TokenType.Instruction,
    TokenType.Sequence,
    TokenType.Comma,
    TokenType.Sequence,
    TokenType.Comma,
    TokenType.Sequence,
  ]);
});

test("Label + directive + string", () => {
  var text = 'label: .ascii "a b c"';
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  verifyTokenTypes(actual, [TokenType.Label, TokenType.Directive, TokenType.Sequence]);
});

test("Line breaks", () => {
  var text = 'label: .ascii "a b c"\n  ADDS r1, r2, #1\n';
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  verifyTokenTypes(actual, [
    TokenType.Label,
    TokenType.Directive,
    TokenType.Sequence,
    TokenType.EndOfLine,
    TokenType.Instruction,
    TokenType.Sequence,
    TokenType.Comma,
    TokenType.Sequence,
    TokenType.Comma,
    TokenType.Sequence,
    TokenType.EndOfLine,
  ]);
});

test("Hash comments", () => {
  var text = "# comment\nabc";
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  verifyTokenTypes(actual, [TokenType.LineComment, TokenType.EndOfLine, TokenType.Instruction]);
});

test("@ comments", () => {
  var text = "abc @ comment\nabc";
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  verifyTokenTypes(actual, [TokenType.Instruction, TokenType.LineComment, TokenType.EndOfLine, TokenType.Instruction]);
});

test("C++ comments", () => {
  var text = "abc // comment\n// abc";
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  verifyTokenTypes(actual, [TokenType.Instruction, TokenType.LineComment, TokenType.EndOfLine, TokenType.LineComment]);
});

test("C block comments 1", () => {
  var text = "abc /* comment */ def\n/* abc\ndef */ klm\n";
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  verifyTokenTypes(actual, [
    TokenType.Instruction,
    TokenType.BlockComment,
    TokenType.Sequence,
    TokenType.EndOfLine,
    TokenType.BlockComment,
    TokenType.Instruction,
    TokenType.EndOfLine,
  ]);
});

test("C block comments 2", () => {
  var text = "label: /**/ abc /* comment */ def\n/* abc\ndef */ klm\n";
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  verifyTokenTypes(actual, [
    TokenType.Label,
    TokenType.BlockComment,
    TokenType.Instruction,
    TokenType.BlockComment,
    TokenType.Sequence,
    TokenType.EndOfLine,
    TokenType.BlockComment,
    TokenType.Instruction,
    TokenType.EndOfLine,
  ]);
});

test("Nested comments 1", () => {
  var text = "// /* comment */ ";
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  verifyTokenTypes(actual, [TokenType.LineComment]);
});

test("Nested comments 2", () => {
  var text = "/* // comment */";
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  verifyTokenTypes(actual, [TokenType.BlockComment]);
});

test("Unclosed C comment", () => {
  var text = "/* comment \n\n";
  var actual = TestUtil.tokenizeToArray(text);
  expect(actual.length).toBe(text.length);
  verifyTokenTypes(actual, [TokenType.BlockComment]);
});

function verifyTokenTypes(actual: TextRangeCollection<Token>, expected: TokenType[]): void {
  expect(actual.count).toBe(expected.length);
  for (var i = 0; i < actual.count; i++) {
    expect(actual.getItemAt(i).tokenType).toBe(expected[i]);
  }
}
