// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.
// Partially based on
//  https://github.com/microsoft/pyright/blob/main/packages/pyright-internal/src/parser/tokenizer.ts
//  https://github.com/MikhailArkhipov/vscode-r/blob/master/src/Languages/Core/Impl/Tokens/NumberTokenizer.cs

import { Char, Character } from "../text/charCodes";
import { CharacterStream } from "../text/characterStream";

export namespace NumberTokenizer {
  export function isPossibleNumber(cs: CharacterStream): boolean {
    // Try an integer or a float
    if (cs.currentChar === Char.Plus || cs.currentChar === Char.Minus) {
      // Next character must be decimal or a dot otherwise
      // it is not a number. No whitespace is allowed.
      if (
        Character.isDecimal(this._cs.nextChar) ||
        (this._cs.nextChar === Char.Period && Character.isDecimal(this._cs.lookAhead(2)))
      ) {
        return true;
      }
    }

    // Try hex
    if (cs.currentChar === Char._0 && (cs.nextChar === Char.x || cs.nextChar === Char.X)) {
      return true;
    }

    // Try decimal, octal or binary
    return Character.isDecimal(cs.currentChar);
  }

  // https://developer.arm.com/documentation/dui0489/e/arm-and-thumb-instructions/general-data-processing-instructions/operand-2-as-a-constant?lang=en
  // https://sourceware.org/binutils/docs/as/Integers.html
  // Constant in hex is 0xFFFFFFFE. 0x is required. HPPA with optional leading 0 is not supported.
  // A binary integer is ‘0b’ or ‘0B’ followed by zero or more of the binary digits ‘01’.
  // An octal integer is ‘0’ followed by zero or more of the octal digits (‘01234567’).
  // A decimal integer starts with a non-zero digit followed by zero or more digits (‘0123456789’).
  // A hexadecimal integer is ‘0x’ or ‘0X’ followed by one or more hexadecimal digits chosen from ‘0123456789abcdefABCDEF’.

  export function handleNumber(cs: CharacterStream): number {
    var start = cs.position;
    // Optional +/-
    if (cs.currentChar === Char.Plus || cs.currentChar === Char.Minus) {
      cs.moveToNextChar();
    }

    if (cs.currentChar === Char._0 && (cs.currentChar === Char.x.valueOf() || cs.currentChar === Char.X.valueOf())) {
      cs.advance(2);
      return handleHex(cs, start);
    }

    var integerPartLength = 0;
    var fractionPartLength = 0;
    var isDouble = false;

    // collect decimals (there may be none like in .1e+20
    while (Character.isDecimal(cs.currentChar)) {
      cs.moveToNextChar();
      integerPartLength++;
    }

    if (cs.currentChar === Char.Period) {
      isDouble = true;
      cs.moveToNextChar();

      // If we've seen period, we need to collect the fractional part
      while (Character.isDecimal(cs.currentChar)) {
        cs.moveToNextChar();
        fractionPartLength++;
      }
    }

    if (integerPartLength + fractionPartLength === 0) {
      return 0; // +e or +.e is not a number and neither is lonely + or -
    }

    var numberLength = 0;
    if (cs.currentChar === Char.e || cs.currentChar === Char.E) {
      isDouble = true;
      numberLength = handleExponent(cs, start);
    } else {
      numberLength = cs.position - start;
    }

    // Verify double format
    if (isDouble && !isValidDouble(cs, start, cs.position)) {
      return 0;
    }
    return numberLength;
  }

  export function isValidDouble(cs: CharacterStream, start: number, length: number): boolean {
    var s = cs.text.getText(start, length);
    var n = parseFloat(s);
    return !Number.isNaN(n);
  }

  function handleHex(cs: CharacterStream, start: number): number {
    while (Character.isHex(cs.currentChar)) {
      cs.moveToNextChar();
    }
    return cs.position - start;
  }

  function handleExponent(cs: CharacterStream, start: number): number {
    var hasSign = false;

    cs.moveToNextChar();
    if (cs.isWhiteSpace() || cs.isEndOfStream()) {
      // 0.1E or 1e
      return 0;
    }

    if (cs.currentChar === Char.Minus || cs.currentChar === Char.Plus) {
      hasSign = true;
      cs.moveToNextChar();
    }

    var digitsStart = cs.position;
    // collect decimals
    while (Character.isDecimal(cs.currentChar)) {
      cs.moveToNextChar();
    }

    if (hasSign && digitsStart === cs.position) {
      return 0; // NaN like 1.0E-
    }

    // Technically if letter or braces follows, this is not
    // a number but we'll leave it alone for now.
    return cs.position - start;
  }
}
