// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as vscode from 'vscode';
import { RDT } from './rdt';
import { TokenType } from '../tokens/tokens';
//import { getInstructionDocumentationUrl } from './documentation';

export function openCurrentInstructionDocumenation(): void {
  const td = vscode.window.activeTextEditor;
  if (td) {
    const ed = RDT.getEditorDocument(td.document);
    if (ed) {
      const tokenIndex = ed.getTokenIndexUnderCaret();
      if (tokenIndex !== undefined && tokenIndex >= 0) {
        const token = ed.tokens.getItemAt(tokenIndex);
        if (token.tokenType === TokenType.Instruction) {
          // const instruction = ed.getTokenText(tokenIndex);
          // const url = getInstructionDocumentationUrl(instruction);
          // if (url) {
          //   vscode.env.openExternal(vscode.Uri.parse(url));
          // }
        }
      }
    }
  }
}
