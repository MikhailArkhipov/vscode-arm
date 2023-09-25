// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

// Partially based on
//  https://github.com/microsoft/pyright/blob/main/packages/pyright-internal/src/parser/tokenizer.ts
//  https://github.com/MikhailArkhipov/vscode-r/blob/master/src/Languages/Core/Impl/Tokens/NumberTokenizer.cs

import { Char, Character } from '../text/charCodes';
import { CharacterStream } from '../text/characterStream';

// https://sourceware.org/binutils/docs/as/Numbers.html
export class NumberTokenizer {
  // https://developer.arm.com/documentation/dui0489/e/arm-and-thumb-instructions/general-data-processing-instructions/operand-2-as-a-constant?lang=en
  // https://sourceware.org/binutils/docs/as/Integers.html
  // Constant in hex is 0xFFFFFFFE. 0x is required. HPPA with optional leading 0 is not supported.
  // A binary integer is ‘0b’ or ‘0B’ followed by zero or more of the binary digits ‘01’.
  // An octal integer is ‘0’ followed by zero or more of the octal digits (‘01234567’).
  // A decimal integer starts with a non-zero digit followed by zero or more digits (‘0123456789’).
  // A hexadecimal integer is ‘0x’ or ‘0X’ followed by one or more hexadecimal digits chosen from ‘0123456789abcdefABCDEF’.
  private readonly _cs: CharacterStream;

  constructor(cs: CharacterStream) {
    this._cs = cs;
  }

  // Returns length of the number
  public tryNumber(): number {
    const start = this._cs.position;
    // Optional +/-
    if (this._cs.currentChar === Char.Plus || this._cs.currentChar === Char.Minus) {
      this._cs.moveToNextChar();
    }

    // https://sourceware.org/binutils/docs/as/Integers.html
    // A binary integer is ‘0b’ or ‘0B’ followed by zero or more of the binary digits ‘01’.
    // An octal integer is ‘0’ followed by zero or more of the octal digits (‘01234567’).
    // A decimal integer starts with a non-zero digit followed by zero or more digits (‘0123456789’).
    // A hexadecimal integer is ‘0x’ or ‘0X’ followed by one or more hexadecimal digits chosen from ‘0123456789abcdefABCDEF’.

    let length = this.tryHexOrBinary();
    if (length === 0) {
      length = this.tryIntegerOrFloat();
    }
    // Final sanity checks
    if (length > 0 && !this.isValidCharAfterNumber()) {
      length = 0;
    }
    // If we didn't find anything, restore stream position.
    if (length === 0) {
      this._cs.position = start;
      return 0;
    }
    return this._cs.position - start;
  }

  // https://sourceware.org/binutils/docs/as/Flonums.html
  private tryIntegerOrFloat(): number {
    let integerPartLength = 0;
    let fractionPartLength = 0;

    const start = this._cs.position;
    const startChar = this._cs.currentChar;

    // collect decimals (there may be none like in .1e+20
    this._cs.skipNonWsSequence((ch) => Character.isDecimal(ch));
    integerPartLength = this._cs.position - start;

    let isFloat = this._cs.currentChar === Char.Period;
    if (isFloat) {
      this._cs.moveToNextChar();
      // If we've seen period, we need to collect the fractional part
      const startFractionalPart = this._cs.position;
      this._cs.skipNonWsSequence((ch) => Character.isDecimal(ch));
      fractionPartLength = this._cs.position - startFractionalPart;
    }

    if (integerPartLength + fractionPartLength === 0) {
      return 0; // +e or +.e is not a number and neither is lonely + or -
    }

    let numberLength = 0;
    if (this._cs.currentChar === Char.e || this._cs.currentChar === Char.E) {
      isFloat = true;
      numberLength = this.handleExponent(start);
      // Verify double format
      if (!this.isValidDouble(this._cs, start, this._cs.position)) {
        numberLength = 0;
      }
    } else {
      numberLength = this._cs.position - start;
    }

    // Verify octals. If a number starts with zero and yet it is not
    // recognized as hex, binary or float, it may be octal. Decimals 
    // cannot start with 0. See if this is really octal.
    if (!isFloat && numberLength > 0 && startChar === Char._0) {
      this._cs.position = start;
      this._cs.skipNonWsSequence((ch) => Character.isOctal(ch));
      if (this._cs.position - start !== numberLength) {
        numberLength = 0;
      }
    }
    return numberLength;
  }

  private tryHexOrBinary(): number {
    if (this._cs.currentChar !== Char._0) {
      return 0;
    }

    const start = this._cs.position;
    // https://sourceware.org/binutils/docs-2.26/as/Integers.html#Integers
    // A hexadecimal integer is `0x' or `0X' followed by one or more hexadecimal digits.
    if ((this._cs.nextChar === Char.x || this._cs.nextChar === Char.X) && Character.isHex(this._cs.lookAhead(2))) {
      // Hex
      this._cs.advance(3);
      this._cs.skipNonWsSequence((ch) => Character.isHex(ch));
    } else if (
      (this._cs.nextChar === Char.b || this._cs.nextChar === Char.B) &&
      Character.isBinary(this._cs.lookAhead(2))
    ) {
      // Binary
      this._cs.advance(3);
      this._cs.skipNonWsSequence((ch) => Character.isBinary(ch));
    } else {
      return 0;
    }
    return this._cs.position - start;
  }

  private isValidDouble(cs: CharacterStream, start: number, length: number): boolean {
    const s = cs.text.getText(start, length);
    const n = parseFloat(s);
    return !Number.isNaN(n);
  }

  private handleExponent(start: number): number {
    let hasSign = false;

    this._cs.moveToNextChar();
    if (this._cs.isWhiteSpace() || this._cs.isEndOfStream()) {
      // 0.1E or 1e
      return 0;
    }

    if (this._cs.currentChar === Char.Minus || this._cs.currentChar === Char.Plus) {
      hasSign = true;
      this._cs.moveToNextChar();
    }

    const digitsStart = this._cs.position;
    // collect decimals
    this._cs.skipNonWsSequence((ch) => Character.isDecimal(ch));
    if (hasSign && digitsStart === this._cs.position) {
      return 0; // NaN like 1.0E-
    }

    return this._cs.position - start;
  }

  private isValidCharAfterNumber(): boolean {
    // Did we end at whitespace, comma or an operator? Or did we break on
    // illegal characters, such as 0xABCDyz? The latter is NaN.
    if (Character.isLetter(this._cs.currentChar) || Character.isDecimal(this._cs.currentChar)) {
      return false;
    }
    if (this._cs.isAtString()) {
      return false;
    }
    if (
      this._cs.currentChar === Char.OpenBrace ||
      this._cs.currentChar === Char.OpenBracket ||
      this._cs.currentChar === Char.OpenParenthesis
    ) {
      return false;
    }
    return true;
  }
}
