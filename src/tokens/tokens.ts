// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { Char, Character } from "../text/charCodes";
import { TextRangeImpl } from "../text/textRange";

// We keep tokens simple and let parser deal with specifics.
// This allows to reuse tokenizer for both GNU and ARM syntaxes.
// Tokenizer is not immediately handling numbers, strings or expressions.
// It is split into specific item tokenizers which are employed
// by the code analysis as needed.
export enum TokenType {
  Unknown = 0,
  // Basically any character sequence except commas and comments.
  // We let parser and code validator to deal with specifics, such as
  // if it is a directive, instruction, immediate or something else.
  // This includes strings.
  Word, // Any characters except whitespace, commas or quotes
  String, // Double quoted
  Comment,
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

export namespace Token {
  export function isSymbol(text: string, start: number, length: number): boolean {
    // GCC https://sourceware.org/binutils/docs-2.26/as/Symbol-Names.html#Symbol-Names
    // Symbol names begin with a letter or with one of `._'. On most machines, you can
    // also use $ in symbol names; exceptions are noted in Machine Dependencies.
    // That character may be followed by any string of digits, letters, dollar signs
    // (unless otherwise noted for a particular target machine), and underscores.
    // Case of letters is significant: foo is a different symbol name than Foo.
    // Symbol names do not start with a digit.
    // TODO: Local labels like '1:' NYI. Same for Unicode label and variable names.

    var matches = text.match(/([a-zA-Z_]+)([a-zA-Z0-9_]*)/g);
    return matches != null && matches.length === 1 && matches[0] === text;
  }

  export function isDirectiveName(text: string): boolean {
    // Directive name starts with a period. Directive name is a symbol.
    if (text.charCodeAt(0) !== Char.Period) {
      return false;
    }
    return Token.isSymbol(text, 1, text.length - 1);
  }

  // Instruction is a symbol but may contain a single period followed by a modifier.
  // Modifier is letter(s) followed optionally by number(s).
  // Example: BCS.W or LDR.I8
  export function isInstructionName(text: string): boolean {
    // INSTR6.I8 - either all upper or all lower case
    var matches = text.match(/[A-Z]+[0-9]*[\.]?[A-Z]*[0-9]?/g);
    if(matches != null && matches.length === 1 && matches[0] === text) {
      return true;
    }
    matches = text.match(/[a-z]+[0-9]*[\.]?[a-z]*[0-9]?/g);
    return matches != null && matches.length === 1 && matches[0] === text;
  }
}
