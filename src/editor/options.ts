// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { Settings, getSetting } from '../core/settings';

// NOT supporting tabs. Spaces only.
export interface FormatOptions {
  // Indentation in spaces
  tabSize: number;
  spaceAfterComma: boolean;
  labelsOnSeparateLines: boolean;
  spaceAroundOperators: boolean;
  alignOperands: boolean;
  alignEolComments: boolean;
  uppercaseLabels: boolean;
  uppercaseDirectives: boolean;
  uppercaseInstructions: boolean;
  uppercaseRegisters: boolean;
}

export interface ColorOptions {
  showColors: boolean;
}

export function getColorOptions(): ColorOptions {
  return {
    showColors: getSetting<boolean>(Settings.showColors, true),
  };
}

export interface DiagnosticOptions {
  showDiagnostic: boolean;
  unknownInstructions: boolean;
  unknownDirectives: boolean;
}

export function getDiagnosticOptions(): DiagnosticOptions {
  return {
    showDiagnostic: getSetting<boolean>(Settings.diagnosticShow, true),
    unknownInstructions: getSetting<boolean>(Settings.diagnosticUnknownInstructions, true),
    unknownDirectives: getSetting<boolean>(Settings.diagnosticUnknownDirectives, true),
  };
}
