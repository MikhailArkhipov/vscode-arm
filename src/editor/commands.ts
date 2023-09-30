// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { RDT } from './rdt';
//import { Token } from '../tokens/tokens';
import { Settings, getSetting } from '../core/settings';
// import { DocView } from '../documentation/docView';
import { outputMessage } from '../core/utility';

export function openCurrentInstructionDocumenation(): void {
  const docFolder = getSetting<string>(Settings.documentationFolder, 'e:\\arm');
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
  // const token = ed.tokens.getItemAt(tokenIndex);
  // if (!Token.isInstruction(token)) {
  //   return;
  // }
  try {
    const instructionName = ed.getTokenText(tokenIndex).toLowerCase();
    const instructionDocFolder = path.join(docFolder, ed.instructionSet);

    const fsEntries = fs.readdirSync(instructionDocFolder).map((e) => e.toLowerCase());
    // See if there is exact match
    let docFile: string | undefined = `${instructionName}.html`;
    const index = fsEntries.indexOf(docFile);
    if (index < 0) {
      const prefix = `${instructionName}_`;
      docFile = fsEntries.find((e) => {
        return e.startsWith(prefix) && e.endsWith('.html');
      });
      if (!docFile) {
        docFile = fsEntries.find((e) => {
          return e.startsWith(instructionName) && e.endsWith('.html');
        });
      }
    }

    if (docFile) {
      // const content = fs.readFileSync(, 'utf-8');
      // DocView.createOrShow(content);
      const uri = `file:///${instructionDocFolder.replace('\\', '/')}/${docFile}`;
      vscode.env.openExternal(vscode.Uri.parse(uri));
    }
  } catch (e) {
    outputMessage(`Unable to display documentation. Error ${e.message}`);
  }
}
