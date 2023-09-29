// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

// Interface must not use 'vscode' for tests to work standalone.
export interface LanguageOptions {
  readonly cLineComments: boolean; // Allow C++ type comments like //.
  readonly cBlockComments: boolean; // Allow C block comments aka /* */.
  // Allow # comments, provided # is the first character in line.
  // Supported by GCC per https://sourceware.org/binutils/docs/as/Comments.html
  readonly hashComments: boolean;
  // Line comment character, '@' (GCC) or ';' (ARM). Runs to the end of the line
  // Arduino also supports ; (AVR Studio) with file extensions .asm
  readonly lineCommentChar: string;
  // Indicates A32 or A64 mode.
  readonly isA64: boolean;
}
