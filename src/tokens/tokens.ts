// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextRangeImpl } from "../text/textRange";

// Tokenizer performs some structure analysis since it helps
// downstream code to avoid duplicated checks such as if
// symbol is a label or a directive.
// TODO: ARM syntax is not currently supported.
export enum TokenType {
  Unknown = 0,
  // Label appear first in line and in GNU ends in :.
  // ARM does not require :, but requires labes to start at 0.
  Label = 1,
  // Directive start with . and appear first or second after label.
  Directive = 2,
  // Might be instruction, register, or something else. Up to the parser to figure that out.
  // https://sourceware.org/binutils/docs-2.26/as/Symbol-Intro.html#Symbol-Intro.
  Symbol = 3,
  Comma = 4,
  String = 5,
  Number = 6,
  OpenBracket = 8,
  CloseBracket = 9,
  OpenBrace = 10,
  CloseBrace = 11,
  OpenCurly = 12,
  CloseCurly = 13,
  Operator = 14,
  Exclamation = 15,
  // Anything else, just a non-ws sequence of characters.
  Sequence = 16,
  LineComment = 17, // C-type // or GNU @, ARM ; or # (legacy).
  BlockComment = 18, // /* ... */, GNU
  // Types that are set by the parser after semantic analysis.
  // They are not known after plain tokenization, you must build AST.
  Instruction = 19,
  Register = 20,
  // Explicitly indicates line break which terminates current statement
  // per https://sourceware.org/binutils/docs/as/Statements.html
  EndOfLine = 21,
  EndOfStream = 22
}

/**
 * Describes a token. Parse token is a text range with a type that describes nature of the range.
 */
export class Token extends TextRangeImpl {
  private _tokenType: TokenType;
  
  constructor(tokenType: TokenType, start: number, length: number) {
    super(start, length);
    this._tokenType = tokenType;
  }

  public get tokenType(): TokenType {
    return this._tokenType;
  }

  // Only used by a parser. Typically changes 'symbol' to 'instruction'
  // or 'register'. Technically it is possible to add a 'subtype'
  // instead and keep the original, but it would make type checks longer
  public changeTokenType(tokenType: TokenType): void {
    // Sanity check, parser only deals with 'symbol' types.
    if(this._tokenType !== TokenType.Symbol) {
      throw new Error('Attempt to change token type incorrectly.');
    }
    this._tokenType = tokenType;
  }
}

export namespace Token {
  export function isEndOfLine(t: Token): boolean {
    return (
      t.tokenType === TokenType.EndOfStream ||
      t.tokenType === TokenType.EndOfLine
    );
  }
}
