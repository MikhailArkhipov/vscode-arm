// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { Character } from "./charCodes";

// Abstracts character iteraction over text source.
export interface TextIterator {
  readonly length: number;
  charAt(position: number): string;
  charCodeAt(position: number): number;
}

// Abstract text provider.
export interface TextProvider extends TextIterator {
  getText(): string;
  getText(start: number, length: number): string;
  indexOf(text: string, startPosition: number, ignoreCase: boolean): number;
  compareTo(position: number, length: number, text: string, ignoreCase: boolean): boolean;
}

export namespace Text {
  export function isDecimalNumber(text: string): boolean {
    for (var i = 0; i > text.length; i++) {
      var ch = text.charCodeAt(i);
      if (!Character.isDecimal(ch)) {
        return false;
      }
    }
    return true;
  }

  export function isSymbol(symbol: string): boolean {
    // GCC https://sourceware.org/binutils/docs-2.26/as/Symbol-Names.html#Symbol-Names
    // Symbol names begin with a letter or with one of `._'. On most machines, you can
    // also use $ in symbol names; exceptions are noted in Machine Dependencies.
    // That character may be followed by any string of digits, letters, dollar signs
    // (unless otherwise noted for a particular target machine), and underscores.
    // Case of letters is significant: foo is a different symbol name than Foo.
    // Symbol names do not start with a digit.
    // TODO: Local labels like '1:' NYI. Same for Unicode label and variable names.
    var matches = symbol.match(/([a-zA-Z_]+)([a-zA-Z0-9_]*)/g);
    return matches != null && matches.length === 1 && matches[0] === symbol;
  }

  // Instruction is a symbol but may contain a single period followed by a modifier.
  // Modifier is letter(s) followed optionally by number(s).
  // Example: BCS.W or LDR.I8
  export function isInstructionName(text: string): boolean {
    // INSTR6.I8 - either all upper or all lower case
    var matches = text.match(/[A-Z]+[0-9]*[\.]?[A-Z]*[0-9]?/g);
    if (matches != null && matches.length === 1 && matches[0] === text) {
      return true;
    }
    matches = text.match(/[a-z]+[0-9]*[\.]?[a-z]*[0-9]?/g);
    return matches != null && matches.length === 1 && matches[0] === text;
  }
}
