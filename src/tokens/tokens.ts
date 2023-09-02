// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { Char } from "../text/charCodes";
import { TextProvider } from "../text/text";
import { TextRangeImpl } from "../text/textRange";
import { TokenStream } from "./tokenStream";

// Tokenizer performs some structure analysis since it helps
// downstream code to avoid duplicated checks such as if
// symbol is a label or a directive.
// TODO: ARM syntax is not currently supported.
export enum TokenType {
  Unknown = 0,
  LineComment, // C-type // or GNU @, ARM ; or # (legacy).
  BlockComment, // /* ... */, GNU
  // Label appear first in line and in GNU ends in :.
  // ARM does not require :, but requires labes to start at 0.
  Label,
  // Directive start with . and appear first or second after label.
  Directive,
  // Instruction is like directive above except it does not start with .
  Instruction,
  String, // Double quoted
  Word, // Any characters except whitespace, commas or quotes
  Comma,
  // Explicitly indicates line break which terminates current statement
  // per https://sourceware.org/binutils/docs/as/Statements.html
  EndOfLine,
  EndOfStream,
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
