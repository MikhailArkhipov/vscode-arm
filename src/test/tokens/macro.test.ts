// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TokenType, TokenSubType, A32Set } from "../../tokens/definitions";
import { TokenTest } from "../utility/tokenTest";

test('mov	r2, R\\reg', () => {
  const code = String.raw`
  .macro name
    mov	r2, R\\reg
  .endm`;
  const actual = TokenTest.tokenizeToArray(code, A32Set);
  TokenTest.verifyTokenTypes(actual, [
    TokenType.EndOfLine,
    TokenType.Directive,
    TokenType.Symbol,
    TokenType.EndOfLine,
    TokenType.Symbol,
    TokenType.Symbol,
    TokenType.Comma,
    TokenType.Symbol,
    TokenType.EndOfLine,
    TokenType.Directive,
  ]);
});

test('.macro =1f', () => {
  const code = String.raw`
  .macro
    mov =1f
`;
  const actual = TokenTest.tokenizeToArray(code);
  TokenTest.verifyTokenTypes(actual, [
    TokenType.EndOfLine,
    TokenType.Directive,
    TokenType.EndOfLine,
    TokenType.Symbol,
    TokenType.Operator,
    TokenType.Symbol,
    TokenType.EndOfLine,
  ]);
  TokenTest.verifyTokenSubTypes(actual, [
    TokenSubType.None,
    TokenSubType.BeginMacro,
    TokenSubType.None,
    TokenSubType.None,
    TokenSubType.None,
    TokenSubType.MacroLabelReference,
    TokenSubType.None,
  ]);
});

test('symbol with backslash()', () => {
  const code = String.raw`
  .macro
  \base\().\length
`
  const actual = TokenTest.tokenizeToArray(code);
  TokenTest.verifyTokenTypes(actual, [
    TokenType.EndOfLine,
    TokenType.Directive,
    TokenType.EndOfLine,
    TokenType.Symbol,
    TokenType.Unknown,
    TokenType.Symbol,
    TokenType.EndOfLine,
  ]);
  TokenTest.verifyTokenSubTypes(actual, [
    TokenSubType.None,
    TokenSubType.BeginMacro,
    TokenSubType.None,
    TokenSubType.MacroParameter,
    TokenSubType.None,
    TokenSubType.MacroParameter,
    TokenSubType.None,
  ]);
});