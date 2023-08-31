// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TokenType } from "../../tokens/tokens";
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
  var result = TestUtil.tokenizeToArray("label: B.N");
  expect(result.length).toBe(10);
  expect(result.count).toBe(2);
  expect(result.getItemAt(0).tokenType).toBe(TokenType.Word);
  expect(result.getItemAt(1).tokenType).toBe(TokenType.Word);
});

test("Tokenize comma", () => {
  var text = "a, b, c";
  var result = TestUtil.tokenizeToArray(text);
  expect(result.length).toBe(text.length);
  expect(result.count).toBe(5);
  expect(result.getItemAt(0).tokenType).toBe(TokenType.Word);
  expect(result.getItemAt(1).tokenType).toBe(TokenType.Comma);
  expect(result.getItemAt(2).tokenType).toBe(TokenType.Word);
  expect(result.getItemAt(3).tokenType).toBe(TokenType.Comma);
  expect(result.getItemAt(4).tokenType).toBe(TokenType.Word);
});

test("Tokenize instruction with operands", () => {
  var text = "label: ADD r1, r2, r3 ";
  var result = TestUtil.tokenizeToArray(text);
  expect(result.length).toBe(text.length-1);
  expect(result.count).toBe(7);
  expect(result.getItemAt(0).tokenType).toBe(TokenType.Word);
  expect(result.getItemAt(1).tokenType).toBe(TokenType.Word);
  expect(result.getItemAt(2).tokenType).toBe(TokenType.Word);
  expect(result.getItemAt(3).tokenType).toBe(TokenType.Comma);
  expect(result.getItemAt(4).tokenType).toBe(TokenType.Word);
  expect(result.getItemAt(5).tokenType).toBe(TokenType.Comma);
  expect(result.getItemAt(6).tokenType).toBe(TokenType.Word);
});

test("Tokenize string", () => {
  var text = "label: .ascii \"a b c\"";
  var result = TestUtil.tokenizeToArray(text);
  expect(result.length).toBe(text.length);
  expect(result.count).toBe(3);
  expect(result.getItemAt(0).tokenType).toBe(TokenType.Word);
  expect(result.getItemAt(1).tokenType).toBe(TokenType.Word);
  expect(result.getItemAt(2).tokenType).toBe(TokenType.String);
});

test("Tokenize line breaks", () => {
  var text = "label: .ascii \"a b c\"\n  ADDS r1, r2, #1\n";
  var result = TestUtil.tokenizeToArray(text);
  expect(result.length).toBe(text.length);
  expect(result.count).toBe(11);
  expect(result.getItemAt(0).tokenType).toBe(TokenType.Word);
  expect(result.getItemAt(1).tokenType).toBe(TokenType.Word);
  expect(result.getItemAt(2).tokenType).toBe(TokenType.String);
  expect(result.getItemAt(3).tokenType).toBe(TokenType.EndOfLine);
  expect(result.getItemAt(4).tokenType).toBe(TokenType.Word);
  expect(result.getItemAt(5).tokenType).toBe(TokenType.Word);
  expect(result.getItemAt(6).tokenType).toBe(TokenType.Comma);
  expect(result.getItemAt(7).tokenType).toBe(TokenType.Word);
  expect(result.getItemAt(8).tokenType).toBe(TokenType.Comma);
  expect(result.getItemAt(9).tokenType).toBe(TokenType.Word);
  expect(result.getItemAt(10).tokenType).toBe(TokenType.EndOfLine);
});

