// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { workspace } from 'vscode';

export namespace Settings {
  // General
  export const documentationFolder = 'arm.general.documentationFolder';
  export const instructionSet = 'arm.general.instructionSet';
  export const reservedRegisterNames = 'arm.general.reservedRegisterNames';
  // Coloring
  export const showColors = 'arm.color.show';
  export const colorRegisters = 'arm.color.registers';
  export const colorVariables = 'arm.color.variables';
  // Formatting options
  export const formattingAlignInstructions = 'arm.formatting.alignOperands';
  export const formattingAlignOperands = 'arm.formatting.alignOperands';
  export const formattingAlignInstructionsPosition = 'arm.formatting.alignInstructionsPosition';
  export const formattingAlignOperandsPosition = 'arm.formatting.alignOperandsPosition';
  export const formattingAlignDirectivesToInstructions = 'arm.formatting.alignDirectivesToInstructions';
  export const formattingAlignBlockDirectivesToInstructions = 'arm.formatting.alignBlockDirectivesToInstructions';
  export const formattingSpaceAfterComma = 'arm.formatting.spaceAfterComma';
  export const formattingSpaceAroundOperators = 'arm.formatting.spaceAroundOperators';
  export const formattingUpperCaseLabels = 'arm.formatting.upperCaseLabels';
  export const formattingUpperCaseInstructions = 'arm.formatting.upperCaseInstructions';
  export const formattingUpperCaseDirectives = 'arm.formatting.upperCaseDirectives';
  export const formattingUpperCaseRegisters = 'arm.formatting.upperCaseRegisters';
  // Hover options
  export const showHover = 'arm.hover.show';
  // Completion options
  export const showCompletions = 'arm.completion.show';
  export const completionShowAdvancedDirectives = 'arm.completion.advancedDirectives';
  // Diagnostic
  export const diagnosticShow = 'arm.diagnostic.show';
  export const diagnosticUnknownInstructions = 'arm.diagnostic.unknownInstructions';
  export const diagnosticUnknownDirectives = 'arm.diagnostic.unknownDirectives';
  export const diagnosticUnknownSymbols = 'arm.diagnostic.unknownSymbols';
  export const diagnosticMixedCasing = 'arm.diagnostic.mixedCasing';

  export const A32Set = 'A32';
  export const A64Set = 'A64';
}

export function getSetting<T>(name: string, defaultValue: T): T {
  const config = workspace.getConfiguration();
  return config.get(name, defaultValue) as T;
}


