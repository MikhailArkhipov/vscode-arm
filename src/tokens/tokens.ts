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
  // Instruction is like directive above except it does not start with .
  Instruction = 3,
  // Anything between commas like label: instr a, b, #(1 + 2)
  Sequence = 4, 
  Comma = 5,
  // Explicitly indicates line break which terminates current statement
  // per https://sourceware.org/binutils/docs/as/Statements.html
  LineComment = 6, // C-type // or GNU @, ARM ; or # (legacy).
  BlockComment = 7, // /* ... */, GNU
  EndOfLine = 8,
  EndOfStream = 9,
}

/**
 * Describes a token. Parse token is a text range with a type that describes nature of the range.
 */
export class Token extends TextRangeImpl {
  public readonly tokenType: TokenType;

  constructor(tokenType: TokenType, start: number, length: number) {
    super(start, length);
    this.tokenType = tokenType;
  }
}

export namespace Token {
  export function isEndOfLine(t: Token): boolean {
    return t.tokenType === TokenType.EndOfStream || t.tokenType === TokenType.EndOfLine;
  }
}