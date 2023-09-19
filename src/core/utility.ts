// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { window } from 'vscode';

const outputChannel = window.createOutputChannel("ARM");
let extensionPath: string;

export function setExtensionPath(extPath: string) {
  extensionPath = extPath;
}
export function getExtensionPath(): string {
  return extensionPath;
}

export function outputMessage(message: string): void {
  outputChannel.appendLine(message);
}