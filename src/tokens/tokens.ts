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
  OpenBracket = 7,
  CloseBracket = 8,
  OpenBrace = 9,
  CloseBrace = 10,
  OpenCurly = 11,
  CloseCurly = 12,
  Operator = 13,
  Exclamation = 14,
  // Anything else, just a non-ws sequence of characters.
  Sequence = 15,
  LineComment = 16, // C-type // or GNU @, ARM ; or # (legacy).
  BlockComment = 17, // /* ... */, GNU
  // Explicitly indicates line break which terminates current statement
  // per https://sourceware.org/binutils/docs/as/Statements.html
  EndOfLine = 18,
  EndOfStream = 19
}

// Subtypes that are set by the parser after semantic analysis.
// They are not known after plain tokenization, you must build AST.
export enum TokenSubType {
  None = 0,
  Instruction = 1,
  Register = 2,
  SymbolDeclaration = 3, // label: {\n}.data_directive (.byte, .word, .asciiz, ...)
  SymbolReference = 4,   // Reference to a symbol or variable
}

/**
 * Describes a token. Parse token is a text range with a type that describes nature of the range.
 */
export class Token extends TextRangeImpl {
  public readonly tokenType: TokenType;
  // Only set by the parser while building the AST. Charifies if 'symbol' is 'instruction'
  // or 'register' - information useful to semantic colorizer as well as to the syntax checker.
  public tokenSubType: TokenSubType;

  constructor(tokenType: TokenType, start: number, length: number) {
    super(start, length);
    this.tokenType = tokenType;
    this.tokenSubType = TokenSubType.None;
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
