// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { workspace } from 'vscode';

export namespace Settings {
  // General
  export const instructionSet = 'arm.general.instructionSet';
  export const reservedRegisterNames = 'arm.general.reservedRegisterNames';
  // Coloring
  export const showColors = 'arm.color.show';
  // Formatting options
  export const labelsOnSeparateLines = "arm.formatting.labelsOnSeparateLines";
  export const formattingAlignOperands = 'arm.formatting.alignOperands';
  export const formattingAlignEolComments = 'arm.formatting.alignEndOfLineComments';
  export const formattingSpaceAfterComma = 'arm.formatting.spaceAfterComma';
  export const formattingSpaceAroundOperators = 'arm.formatting.spaceAroundOperators';
  export const formattingLabelsCase = 'arm.formatting.labelsCase';
  export const formattingDirectivesCase = 'arm.formatting.directivesCase';
  export const formattingInstructionsCase = 'arm.formatting.instructionsCase';
  export const formattingRegistersCase = 'arm.formatting.registersCase';
  // Hover options
  export const showHover = 'arm.hover.show';
  // Completion options
  export const showCompletions = 'arm.completion.show';
  export const completionShowAdvancedDirectives = 'arm.completion.advancedDirectives';
  // Diagnostic
  export const diagnosticShow = 'arm.diagnostic.show';
  export const diagnosticUnknownInstructions = 'arm.diagnostic.unknownInstructions';
  export const diagnosticUnknownDirectives = 'arm.diagnostic.unknownDirectives';
}

export function getSetting<T>(name: string, defaultValue: T): T {
  const config = workspace.getConfiguration();
  return config.get(name, defaultValue) as T;
}
