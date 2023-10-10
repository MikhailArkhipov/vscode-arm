# ARM Assembly Language support for Visual Studio Code
A [Visual Studio Code](https://code.visualstudio.com/) [extension](https://marketplace.visualstudio.com/VSCode) provides support for the [ARM Assembly language](https://developer.arm.com/documentation/dui0068/b/ARM-Instruction-Reference) when using GAS (GCC Assembler). 

![ARM Assembly editor](https://github.com/MikhailArkhipov/vscode-arm/blob/eeb6ad9e582abf3ab21d62cb3735e2fae97182d5/images/Screen1.png)

# Features
Features include semantic coloring, tooltips/hover, completions, code formatting, basic syntax checking. Assembly syntax is [GAS/GCC](https://sourceware.org/binutils/docs/as/index.html#SEC_Contents)

## Colorizer
Adds new colorable items: 
- `directive` 
- `instruction`, 
- `register` 

and the following modifiers: 
- `definition` (symbols defined via `.set` or similar)
- `declaration` (data declarations such as `.asciz`).
- `include` (`.include` directive)
- `condition` (`.if/.endif/...` directives)
- `macro` (`.macro` directive)
- `macroName` (name of the macro)
- `macroParameter`, (macro parameter reference via `\\`)
- `unrecognized` (unrecognized instruction)

To customize colors combine item with modifiers, like `directive.include`.

## Hover
![ARM Assembly editor](https://github.com/MikhailArkhipov/vscode-arm/blob/eeb6ad9e582abf3ab21d62cb3735e2fae97182d5/images/Screen2.png)

## Completions
![ARM Assembly editor](https://github.com/MikhailArkhipov/vscode-arm/blob/eeb6ad9e582abf3ab21d62cb3735e2fae97182d5/images/Screen4.png)

## Instruction documentation in browser
![ARM Assembly editor](https://github.com/MikhailArkhipov/vscode-arm/blob/eeb6ad9e582abf3ab21d62cb3735e2fae97182d5/images/Screen3.png)

## Formatting
Formatter by default automatically derives instruction set (architecture) as well as indentation and casing settings from the document. Options can be set to non-auto values in settings. 

## Limitations
- ARM Assembler syntax is not supported. 
- Syntax check is basic, the feature is far from complete and is diagnostics is off by default.
- Formatting does not support using tabs. Tabs are converted to spaces.

# Acknowledgements
- Documentation on ARM instructions comes from [ARM Documentation site](https://developer.arm.com/downloads/-/exploration-tools).
- The code is partially based on my work when at Microsoft: [R Tools for VS Code](https://github.com/MikhailArkhipov/vscode-r), which, in turn, was forked off [Microsoft RTVS](https://github.com/microsoft/rtvs). Mostly tokenizer and parser, translated from C# to TypeScript, simplified and adapted for assembly language syntax. 
- Some original C# code was already translated to TypeScript in [Pyright](https://github.com/microsoft/pyright), hence small amount was taken from there (fragments primarily related to the tokenization and supporting classes).
- Documentation on instruction was extracted from ARM doc archives downloaded from [here](https://developer.arm.com/downloads/-/exploration-tools). All documentation belongs to Arm Limited. 
- Documentation on directives in hover tooltips is fetched online directly from the [GAS Web site](https://sourceware.org/binutils/docs/as/index.html#SEC_Contents).

# Bugs and feedback
Feel free to file bugs and suggestions at [vscode-arm](https://github.com/MikhailArkhipov/vscode-arm) repo.



