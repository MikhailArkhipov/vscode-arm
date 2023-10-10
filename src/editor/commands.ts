// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { RDT } from './rdt';
import { TokenSubType, TokenType } from '../tokens/definitions';
import { getDirectiveDocumentationUrl, getInstructionDocumentationUrl } from './documentation';
import { Uri, env, window } from 'vscode';

export function openCurrentItemDocumentation(): void {
  const td = window.activeTextEditor;
  if (!td) {
    return;
  }
  const ed = RDT.getEditorDocument(td.document);
  if (!ed) {
    return;
  }

  const curTokenIndex = ed.getTokenIndexUnderCaret();
  if (curTokenIndex === undefined || curTokenIndex < 0) {
    return;
  }

  const t = ed.tokens.getItemAt(curTokenIndex);
  const tokenText = ed.getTokenText(t);
  switch (t.type) {
    case TokenType.Directive:
      openDirectiveDocumentation(tokenText);
      break;
    case TokenType.Symbol:
      if (t.subType === TokenSubType.Instruction) {
        openInstructionDocumentation(tokenText, ed.instructionSet);
      }
      break;
  }
}

function openDirectiveDocumentation(directiveName: string): void {
  const uri = getDirectiveDocumentationUrl(directiveName);
  env.openExternal(Uri.parse(uri));
}

function openInstructionDocumentation(instructionName: string, instructionSet: string): void {
  const uri = getInstructionDocumentationUrl(instructionName, instructionSet);
  if (uri) {
    env.openExternal(Uri.parse(uri));
  }
}
