# ARM Assembly Language support for Visual Studio Code
A [Visual Studio Code](https://code.visualstudio.com/) [extension](https://marketplace.visualstudio.com/VSCode) provides support for the [ARM Assembly language](https://developer.arm.com/documentation/dui0068/b/ARM-Instruction-Reference) when using GAS (GCC Assembler). 

# Features
Features include semantic coloring, tooltips/hover, completions, code formatting, basic syntax checking. Assembly syntax is [GAS/GCC](https://sourceware.org/binutils/docs/as/index.html#SEC_Contents)

Colorizer adds new colorable items: `directive`, `instruction`, `register`.

# Limitations
ARM Assembler syntax is not supported. Syntax check is basic, the feature is far from complete.

# ARM instructions documentation
- Download A32 and A64 XML instruction set archives from [here](https://developer.arm.com/downloads/-/exploration-tools).
- Create folder somewhere on disk.
- Create A32 and A64 subfolders.
- You may need [7Zip](https://7-zip.org/) or similar on Windows.
- Extract contents of the A32 archive's XHTML subfolder (*.html files) to A32 subfolder.
- Extract A64 archive's XHTML subfolder into A64 subfolder.
- Enter path to the folder that contains A32 and A64 subfolders into extension settings (`Folder with ARM instruction documentation in HTML`).
- You should be able to use 'Open instruction documentation in browser' command in the extension - position caret over the instruction, then press `Ctrl+O, Ctrl+D` to open local instruction(s) documentation in the default Web browser.

# Acknowledgements
- The code is partially based on my work when at Microsoft: [R Tools for VS Code](https://github.com/MikhailArkhipov/vscode-r), which, in turn, was forked off [Microsoft RTVS](https://github.com/microsoft/rtvs). Mostly tokenizer and parser, translated from C# to TypeScript, simplified and adapted for assembly language syntax. 
- Some original C# code was already translated to TypeScript in [Pyright](https://github.com/microsoft/pyright), hence small amount was taken from there (fragments primarily related to the tokenization and supporting classes).
- Documentation on instruction was extracted from ARM doc archives downloaded from [here](https://developer.arm.com/downloads/-/exploration-tools). All documentation belongs to Arm Limited. 
- Documentation on directives in hover tooltips is fetched online directly from the [GAS Web site](https://sourceware.org/binutils/docs/as/index.html#SEC_Contents).

# Bugs and feedback
Feel free to file bugs and suggestings at [vscode-arm](https://github.com/MikhailArkhipov/vscode-arm) repo.



