// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as vscode from 'vscode';

export namespace Settings {
  export const completionShowAdvancedDirectives = "arm.completion.showAdvancedDirectives";
  export const formattingSpaceAfterComma = "arm.formatting.spaceAfterComma";
}

export function getConfiguration(name: string): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration('vscode-arm');
}
export function getSetting<T>(name: string, defaultValue: T): T {
  const config = vscode.workspace.getConfiguration('vscode-arm');
  return config.get(name, defaultValue) as T;
}