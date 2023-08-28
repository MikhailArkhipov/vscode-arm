// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextRangeImpl } from "../text/textRange";

export const enum TokenType {
    Unknown,
    Identifier,
    Comment,
    Period, // .
    String, // Double quoted
    Number,
    // TODO: possibly when parsing expressions
    //Operator,
    //OpenCurlyBrace,
    //CloseCurlyBrace,
    //OpenSquareBracket,
    //CloseSquareBracket,
    //OpenBrace,
    //CloseBrace,
    Comma,
    Colon,
    // TODO: this is only needed to support multiple statements 
    // in a line which is not a high priority.
    // Semicolon, // When not a comment
    Exclamation,
    Hash,  // When not a comment, such as in immediate in 'SUBS r8, r6, #240'
    Equals, // =address
    // Explicitly indicates line break which terminates current statement
    // per https://sourceware.org/binutils/docs/as/Statements.html
    EndOfLine, 
    EndOfStream
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
  