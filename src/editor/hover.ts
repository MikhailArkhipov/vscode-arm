// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextDocument, Position, Hover, Range } from "vscode";
import { TextStream } from "../text/textStream";
import { Tokenizer } from "../tokens/tokenizer";
import { TokenType } from "../tokens/tokens";
import { AssemblerType, SyntaxConfig } from "../syntaxConfig";
import { getDirectiveDocumentation } from "./documentation";

export async function provideHover(
  document: TextDocument,
  position: Position
): Promise<Hover> {
  const nextLine = Math.min(position.line + 1, document.lineCount - 1);
  const start = new Position(0, 0);
  const end = document.lineAt(nextLine).range.end;
  const range = new Range(start, end);
  const text = document.getText(range);
  const pt = document.offsetAt(position);

  const t = new Tokenizer(SyntaxConfig.create(AssemblerType.GNU));
  const tokens = t.tokenize(new TextStream(text), 0, text.length, false).tokens;

  const index = tokens.getItemContaining(pt);
  if (index >= 0) {
    const token = tokens.getItemAt(index);
    if (token.tokenType === TokenType.Directive) {
      var doc = await getDirectiveDocumentation(
        text.substring(token.start, token.end)
      );
      if (doc) {
        return new Hover(doc);
      }
    }
  }
  return new Hover("");
}
