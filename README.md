# ARM Assembly Language Editor support for Visual Studio Code
A [Visual Studio Code](https://code.visualstudio.com/) [extension](https://marketplace.visualstudio.com/VSCode) provides support for the [ARM Assembly language](https://developer.arm.com/documentation/dui0068/b/ARM-Instruction-Reference) when using GAS (GCC Assembler). 

# Features
Features include syntax checking, completions, code formatting, file. More planned in the future.

Currently ARM Assembler syntax is not supported. Coloring is not provided as there are few existing extensions such as https://[Arm Assembly](marketplace.visualstudio.com/items?itemName=dan-c-underwood.arm) that implement the functionality. I recommend installig one of them in order to get syntax coloring.

# ARM Assembly Syntax
Note that file syntax references are somewhat contradictory. For example, [Here](https://ftp.gnu.org/old-gnu/Manuals/gas-2.9.1/html_chapter/as_11.html#SEC152) ';' is allowed as comment character in ARM while [Here](https://sourceware.org/binutils/docs/as/ARM_002dChars.html#ARM_002dChars) documentation says '@' must be used for line comments while ';' is an instruction separator. The former reference may be old although GAS version appear to be modern. This extension follows the [latter documentation](https://sourceware.org/binutils/docs/as/ARM_002dChars.html#ARM_002dChars)

# Acknowledgements
The code is partially based on Microsoft code in https://github.com/MikhailArkhipov/vscode-r (which, in turn, was forked off https://github.com/microsoft/rtvs), translated from C# to TypeScript. Some related code was already translated to TypeScript in https://github.com/microsoft/pyright, so small amount was taken from there as well (pieces primarily related to tokenization and character streams).

# Bugs and feedback


