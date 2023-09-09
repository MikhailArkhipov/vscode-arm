// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import {
  TextDocument,
  FormattingOptions,
  TextEdit,
  Position,
  Range,
} from "vscode";
import { FormatOptions, Formatter } from "./formatter";
import { SyntaxConfig, AssemblerType } from "../syntaxConfig";
import { TextStream } from "../text/textStream";

export function formatDocument(
  document: TextDocument,
  options: FormattingOptions
): TextEdit[] {
  const fo = new FormatOptions();
  fo.tabSize = options.tabSize;
  fo.spaceAfterComma = true;

  const formatter = new Formatter();
  const text = document.getText();
  const formattedText = formatter.formatDocument(
    new TextStream(text),
    fo,
    SyntaxConfig.create(AssemblerType.GNU)
  );

  const start = new Position(0, 0);
  const end = document.lineAt(document.lineCount - 1).range.end;
  const range = new Range(start, end);
  return [new TextEdit(range, formattedText)];
}
