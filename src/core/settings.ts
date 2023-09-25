// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { WorkspaceConfiguration, workspace } from "vscode";

export namespace Settings {
  // General functionality
  export const showCompletions = "arm.editor.completions";
  export const showHover = "arm.editor.hover";
  export const showColors = "arm.editor.coloring";
  // Instruction set to use
  export const instructionSet = "arm.instructionSet";
  export const reservedRegisterNames = "arm.reservedRegisterNames";
  // Formatting options
  export const formattingSpaceAfterComma = "arm.formatting.spaceAfterComma";
  export const formattingUpperCaseInstructions = "arm.formatting.upperCaseInstructions";
  export const formattingUpperCaseDirectives = "arm.formatting.upperCaseDirectives";
  export const formattingUpperCaseRegisters = "arm.formatting.upperCaseRegisters";
  export const formattingAlignOperands = "arm.formatting.alignOperands";
  export const formattingSpaceAroundOperators = "arm.formatting.spaceAroundOperators";
  export const formattingAlignDirectivesToInstructions= "arm.formatting.alignDirectivesToInstructions";
  export const formattingAlignBlockDirectivesToInstructions= "arm.formatting.alignBlockDirectivesToInstructions";
  // Completion options
  export const completionShowAdvancedDirectives = "arm.completion.showAdvancedDirectives";
  // Validation
  export const editorValidation = "arm.editor.validation";
  // Documentation
  export const documentationFolder = "arm.documentationFolder";
}

export function getConfiguration(name: string): WorkspaceConfiguration {
  return workspace.getConfiguration('vscode-arm');
}
export function getSetting<T>(name: string, defaultValue: T): T {
  const config = workspace.getConfiguration('vscode-arm');
  return config.get(name, defaultValue) as T;
}
