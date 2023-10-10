// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextDocument, Position, Hover, MarkdownString, CancellationToken } from 'vscode';
import { getDirectiveDocumentation } from './documentation';
import { RDT } from './rdt';
import { Settings, getSetting } from '../core/settings';
import { Token, TokenSubType, TokenType } from '../tokens/definitions';
import { getInstructionInfo } from '../AST/instructionInfo';

export async function provideHover(
  td: TextDocument,
  position: Position,
  ct: CancellationToken
): Promise<Hover | undefined> {
  const ed = RDT.getEditorDocument(td);
  if (!ed || !getSetting<boolean>(Settings.showHover, true)) {
    return;
  }
  const offset = td.offsetAt(position);
  const tokenIndex = ed.tokens.getItemContaining(offset);
  if (tokenIndex < 0 || Token.isComment(ed.tokens.getItemAt(tokenIndex))) {
    return;
  }

  const token = ed.tokens.getItemAt(tokenIndex);
  const itemName = ed.getTokenText(token);

  let doc: MarkdownString | undefined;
  switch (token.type) {
    case TokenType.Directive:
      doc = await getDirectiveDocumentation(itemName, ct);
      break;

    case TokenType.Symbol:
      if (token.subType === TokenSubType.Instruction) {
        doc = getInstructionDocumentation(itemName, ed.instructionSet);
      }
      break;
  }

  return doc ? new Hover(doc) : undefined;
}

function getInstructionDocumentation(instructionName: string, instructionSet: string): MarkdownString | undefined {
  const pi = getInstructionInfo(instructionName.toUpperCase(), instructionSet);
  if (pi.name && pi.name.length > 0 && pi.description && pi.description.length > 0) {
    return new MarkdownString(`#### ${pi.name}\n\n${pi.description}`);
  }
}
