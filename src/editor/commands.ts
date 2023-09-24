// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { RDT } from './rdt';
import { Token } from '../tokens/tokens';
import { Settings, getSetting } from '../core/settings';
import { DocView } from '../documentation/docView';
import { outputMessage } from '../core/utility';

export function openCurrentInstructionDocumenation(): void {
  const docFolder = getSetting<string>(Settings.documentationFolder, '');
  if (!docFolder || docFolder.length === 0) {
    return;
  }
  const td = vscode.window.activeTextEditor;
  if (!td) {
    return;
  }
  const ed = RDT.getEditorDocument(td.document);
  if (!ed) {
    return;
  }
  const tokenIndex = ed.getTokenIndexUnderCaret();
  if (tokenIndex === undefined || tokenIndex < 0) {
    return;
  }
  const token = ed.tokens.getItemAt(tokenIndex);
  if (!Token.isInstruction(token)) {
    return;
  }
  try {
    const instructionName = ed.getTokenText(tokenIndex).toLowerCase();
    const instructionSet = getSetting<string>(Settings.instructionSet, 'A64');
    const instructionDocFolder = path.join(docFolder, instructionSet);

    const fsEntries = fs.readdirSync(instructionDocFolder);
    const docFile = fsEntries.find((e) => {
      const name = e.toLowerCase();
      return name.startsWith(instructionName) && name.endsWith('.html');
    });

    if (docFile) {
      const content = fs.readFileSync(path.join(instructionDocFolder, docFile), 'utf-8');
      DocView.createOrShow(content);
      //vscode.env.openExternal(vscode.Uri.parse(`http://{}`));
    }
  } catch (e) {
    outputMessage(`Unable to display documentation. Error ${e.message}`);
  }
}
