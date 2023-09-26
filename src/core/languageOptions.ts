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
  // GNU labels are 'label:' while ARM does not require colon and rather 
  // require label to start at the beginning of the line.
  readonly colonInLabels: boolean; 
  // Indicates A32 or A64 mode.
  readonly isA64: boolean;
  // Treat R0-R15, W0-W31, etc as register names. This helps
  // colorizer and parser and may flag other (confusing) uses of
  // identifiers that look like registers elsewhere.
  readonly reservedRegisterNames: boolean;  
}