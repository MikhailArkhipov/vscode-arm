// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TokenType } from "../../tokens/tokens";
import { TestUtil } from "../utility";

test("Tokenize empty string", () => {
  var result = TestUtil.tokenizeToString("");
  expect(result.length).toBe(0);
});

test("Tokenize label", () => {
  var result = TestUtil.tokenizeToArray("label:");
  expect(result.length).toBe(6);
  expect(result.count).toBe(1);
  expect(result.getItemAt(0).tokenType).toBe(TokenType.Word);
});
