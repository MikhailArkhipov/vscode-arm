// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { LanguageOptions } from '../core/languageOptions';
import { Settings, getSetting } from '../core/settings';

// GCC/GAS:
//   https://sourceware.org/binutils/docs/as/
//   https://developers.redhat.com/blog/2021/02/26/tips-for-writing-portable-assembler-with-gnu-assembler-gas

export function getLanguageOptions(): LanguageOptions {
  return {
    lineCommentChar: '@', // Line comments start with @
    cLineComments: true, // Allow C++ style line comments i.e. //
    cBlockComments: true, // Allow C block comments /* */
    // GNU-specific.
    hashComments: true,
    isA64: getSetting<string>(Settings.instructionSet, 'A64') === 'A64',
  };
}

// NOT supporting tabs. Spaces only.
export interface FormatOptions {
  tabSize: number;
  spaceAfterComma: boolean;
  spaceAroundOperators: boolean;
  uppercaseLabels: boolean;
  uppercaseDirectives: boolean;
  uppercaseInstructions: boolean;
  uppercaseRegisters: boolean;
  alignInstructions: boolean;
  alignOperands: boolean;
  alignInstructionsPosition: number;
  alignOperandsPosition: number;
  alignDirectivesToInstructions: boolean;
  alignBlockDirectivesToInstructions: boolean;
}

export function getFormatOptions(): FormatOptions {
  return {
    tabSize: getSetting<number>('editor.indentSize', 4),
    spaceAfterComma: getSetting<boolean>(Settings.formattingSpaceAfterComma, true),
    spaceAroundOperators: getSetting<boolean>(Settings.formattingSpaceAroundOperators, true),
    uppercaseLabels: getSetting<boolean>(Settings.formattingUpperCaseLabels, false),
    uppercaseDirectives: getSetting<boolean>(Settings.formattingUpperCaseDirectives, false),
    uppercaseInstructions: getSetting<boolean>(Settings.formattingUpperCaseInstructions, false),
    uppercaseRegisters: getSetting<boolean>(Settings.formattingUpperCaseRegisters, false),
    alignInstructions: getSetting<boolean>(Settings.formattingAlignInstructions, true),
    alignOperands: getSetting<boolean>(Settings.formattingAlignOperands, true),
    alignInstructionsPosition: getSetting<number>(Settings.formattingAlignInstructionsPosition, 0),
    alignOperandsPosition: getSetting<number>(Settings.formattingAlignOperandsPosition, 0),
    alignDirectivesToInstructions: getSetting<boolean>(Settings.formattingAlignDirectivesToInstructions, true),
    alignBlockDirectivesToInstructions: getSetting<boolean>(
      Settings.formattingAlignBlockDirectivesToInstructions,
      false
    ),
  };
}

export interface ColorOptions {
  showColors: boolean;
  registers: boolean;
  variables: boolean;
}

export function getColorOptions(): ColorOptions {
  return {
    showColors: getSetting<boolean>(Settings.showColors, true),
    registers: getSetting<boolean>(Settings.colorRegisters, true),
    variables: getSetting<boolean>(Settings.colorVariables, true),
  };
}

export interface DiagnosticOptions {
  showDiagnostic: boolean;
  unknownInstructions: boolean;
  unknownDirectives: boolean;
  unknownSymbols: boolean;
  mixedCasing: boolean;
}

export function getDiagnosticOptions(): DiagnosticOptions {
  return {
    showDiagnostic: getSetting<boolean>(Settings.diagnosticShow, true),
    unknownInstructions: getSetting<boolean>(Settings.diagnosticUnknownInstructions, true),
    unknownDirectives: getSetting<boolean>(Settings.diagnosticUnknownDirectives, true),
    unknownSymbols: getSetting<boolean>(Settings.diagnosticUnknownSymbols, true),
    mixedCasing: getSetting<boolean>(Settings.diagnosticMixedCasing, true),
  };
}
