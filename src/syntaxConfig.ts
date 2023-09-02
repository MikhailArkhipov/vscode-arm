// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

// GCC/GAS:
//   https://sourceware.org/binutils/docs/as/
//   https://developers.redhat.com/blog/2021/02/26/tips-for-writing-portable-assembler-with-gnu-assembler-gas
// ARM:
//   https://developer.arm.com/documentation/den0013/d/
//   https://developer.arm.com/documentation/100068/0615/Migrating-from-Arm-Compiler-5-to-Arm-Compiler-6/Toolchain-differences
//   ARM is migrating to armclang which is like GAS

// https://smist08.wordpress.com/2021/01/08/apple-m1-assembly-language-hello-world/
// Differences Between MacOS and Linux (from language syntax perspective):
//
// - MacOS uses LLVM by default whereas Linux uses GNU GCC. This really just affects the command line arguments 
//   in the makefile for the purposes of this article. You can use LLVM on Linux and GCC should be available.
// - The Unix API calls are nearly the same, the difference is that Linux redid the function numbers when they 
//   went to 64-bit, but MacOS kept the function numbers the same. In the 32-bit world they were the same, 
//   but now they are all different.
// - When calling a Linux service the function number goes in X16 rather than X8.
// - In MacOS the program must start on a 64-bit boundary, hence the listing has an “.align 2” directive near top.
// - In MacOS the default entry point is _main whereas in Linux it is _start. This is changed via a command line argument to the linker.
//
// Basically GCC/LLVM differentce is .align 2 and _start vs _main. Which may be useful to code validation.

// Arduino assembly looks like GCC, BUT with ; as comments.
// https://ww1.microchip.com/downloads/en/DeviceDoc/Atmel-0856-AVR-Instruction-Set-Manual.pdf
// https://micropi.wordpress.com/2021/03/23/program-the-arduino-uno-in-assembly-language/ 
// https://gist.github.com/mhitza/8a4608f4dfdec20d3879 

// GCC has 'unified' syntax between ARM and THUMB. It is activated by .syntax directive.
// It no longer requires # for immediate values.
// https://sourceware.org/binutils/docs-2.26/as/ARM_002dInstruction_002dSet.html#ARM_002dInstruction_002dSet

// Tokenizer and parser syntax configurations
export const enum AssemblerType {
  GNU,
  ARM,    // ARM Toolchain, syntax analysis NYI. ARM is migrating to armclang, so armasm is legacy.
  // AVR, // Arduino/Atmel, somewhat different in syntax from GCC (line comment is ; line in ARM).
  // CLANG // Apple - Is Clang 'as' syntax any different from GNU?
}

export class AssemblerConfig {
  public assemblerName: string; // Human readable assembler name, such as 'GNU', 'ARM' or 'CLang'.
  public cLineComments: boolean; // Allow C++ type comments like //.
  public cBlockComments: boolean; // Allow C block comments aka /* */.
  // Allow # comments, provided # is the first character in line. 
  // Supported by GCC per https://sourceware.org/binutils/docs/as/Comments.html
  public hashComments: boolean; 
  // Line comment character, '@' (GCC) or ';' (ARM). Runs to the end of the line
  // Arduino also supports ; (AVR Studio) with file extensions .asm
  public lineCommentChar: string; 
  // C-syntax expressions in directives and immediates, ex '.dc.b (val & 0xff), (val >> 8) & 0xff'
  public expressions: boolean; 
  // GNU labels are 'label:' while ARM does not require colon and rather 
  // require label to start at the beginning of the line.
  public colonInLabels: boolean; 
  // Some assemblers support multiple statements in line, separated by semicolon. NYI.
  // public statementSeparator: boolean;
  public immediatePrefix: string;
  // Indicated if .syntax directive is supported (GCC).
  public supportsUnifiedSyntax: boolean;
  // Set by directive parser to activate GCC 'unified' syntax.
  public unifiedSyntax: boolean;
  // ARM uses labels without :.
  public labelRequiresColon: boolean;
}

export namespace SyntaxConfig {
  export function create(assemblerType: AssemblerType): AssemblerConfig {
    var ac = new AssemblerConfig();

    switch (assemblerType) {
      case AssemblerType.GNU:
        ac.assemblerName = "GNU";
        ac.lineCommentChar = "@"; // Line comments start with @
        ac.cLineComments = true;  // Allow C++ style line comments i.e. //
        ac.cBlockComments = true; // Allow C block comments /* */
        // This is controversial. GAS docs say that on ARM GCC only allows @.
        // https://codedocs.org/what-is/gnu-assembler#Multi-line_comments
        // BUT https://sourceware.org/binutils/docs/as/Comments.html says otherwise (GNU Binutils 2.41).
        // Also, https://sourceware.org/binutils/docs-2.26/as/ARM_002dChars.html#ARM_002dChars
        // # comment must start at the beginning of the line.
        ac.hashComments = true;
        ac.expressions = true;
        ac.unifiedSyntax
        ac.immediatePrefix = "#$"; // GCC supports both #123 and $123.
        // ac.statementSeparator = Char.Semicolon; NYI in tokenizer. Probably never will be.
        ac.supportsUnifiedSyntax = true;
        ac.labelRequiresColon = true;
        ac.colonInLabels = true;
        break;

      case AssemblerType.ARM:
        // Very preliminary settings. ARM format support is TBD, depending on the interest.
        ac.assemblerName = "ARM";
        ac.lineCommentChar = ";"; // Line comments start with @
        ac.cLineComments = true; // Allow C++ style line comments i.e. //
        ac.cBlockComments = true; // Allow C block comments /* */
        ac.immediatePrefix = "#";
        break;
    }

    return ac;
  }
}
