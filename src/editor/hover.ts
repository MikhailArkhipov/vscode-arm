// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextDocument, Position, Hover, Range, MarkdownString } from "vscode";
import { TokenType } from "../tokens/tokens";
import {
  getDirectiveDocumentation,
  getInstructionDocumentation,
} from "./documentation";
import { RDT } from "./rdt";

export async function provideHover(
  td: TextDocument,
  position: Position
): Promise<Hover> {
  const ed = RDT.getEditorDocument(td);
  if (!ed) {
    return new Hover("");
  }

  const offset = td.offsetAt(position);
  const tokenIndex = ed.tokens.getItemContaining(offset);
  if (tokenIndex < 0 || ed.isComment(tokenIndex)) {
    return new Hover("");
  }

  const token = ed.tokens.getItemAt(tokenIndex);
  const range = new Range(td.positionAt(token.start), td.positionAt(token.end));
  const tokenText = td.getText(range);

  let doc: MarkdownString | undefined;
  switch (token.tokenType) {
    case TokenType.Directive:
      doc = await getDirectiveDocumentation(tokenText);
      break;

    case TokenType.Instruction:
      doc = getInstructionDocumentation(tokenText);
      break;
  }

  return new Hover(doc ?? "");
}
