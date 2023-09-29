// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextDocument, Position, Hover, Range, MarkdownString, CancellationToken } from 'vscode';
import { getDirectiveDocumentation, getInstructionDocumentation } from '../documentation/documentation';
import { RDT } from './rdt';
import { Settings, getSetting } from '../core/settings';
import { Token, TokenSubType, TokenType } from '../tokens/definitions';

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
  const range = new Range(td.positionAt(token.start), td.positionAt(token.end));
  const tokenText = td.getText(range);

  let doc: MarkdownString | undefined;
  switch (token.type) {
    case TokenType.Directive:
      doc = await getDirectiveDocumentation(tokenText, ct);
      break;

    case TokenType.Symbol:
      if (token.subType === TokenSubType.Instruction) {
        doc = await getInstructionDocumentation(tokenText, ct);
      }
      break;
  }

  return doc ? new Hover(doc) : undefined;
}
