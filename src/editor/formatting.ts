// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextDocument, FormattingOptions, TextEdit, Position, Range } from 'vscode';
import { FormatOptions, Formatter } from './formatter';
import { Settings, getSetting } from '../core/settings';
import { RDT } from './rdt';

export function formatDocument(td: TextDocument, options: FormattingOptions): TextEdit[] {
  const fo = new FormatOptions();
  fo.tabSize = options.tabSize;
  fo.spaceAfterComma = getSetting<boolean>(Settings.formattingSpaceAfterComma, true);
  fo.uppercaseInstructions = getSetting<boolean>(Settings.formattingUpperCaseInstructions, false);
  fo.uppercaseDirectives = getSetting<boolean>(Settings.formattingUpperCaseDirectives, false);
  fo.uppercaseRegisters = getSetting<boolean>(Settings.formattingUpperCaseRegisters, false);
  fo.alignOperands = getSetting<boolean>(Settings.formattingAlignOperands, true);
  fo.spaceAroundOperators = getSetting<boolean>(Settings.formattingSpaceAroundOperators, false);
  fo.alignDirectivesToInstructions = getSetting<boolean>(Settings.formattingAlignDirectivesToInstructions, false);

  const ed = RDT.getEditorDocument(td);
  if(!ed) {
    return [];
  }

  const formatter = new Formatter();
  const text = ed.textDocument.getText();
  const formattedText = formatter.formatDocument(text, ed.tokens, fo);

  const start = new Position(0, 0);
  const end = td.lineAt(td.lineCount - 1).range.end;
  const range = new Range(start, end);
  return [new TextEdit(range, formattedText)];
}
