// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ExtensionContext, languages, TextDocument, FormattingOptions, TextEdit, Disposable, Range, Position } from "vscode";
import { FormatOptions, Formatter } from "./format/formatter";
import { AssemblerType, SyntaxConfig } from "./syntaxConfig";
import { TextStream } from "./text/textStream";

var disposables: Disposable[] = [];

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: ExtensionContext) {
  disposables.push(
    languages.registerDocumentFormattingEditProvider("arm", {
      provideDocumentFormattingEdits(document: TextDocument, options: FormattingOptions): TextEdit[] {
        return formatDocument(document, options);
      },
    })
  );
}

export async function deactivate(): Promise<void> {
  disposables.forEach(d => d.dispose());
}

function formatDocument(document: TextDocument, options: FormattingOptions): TextEdit[] {
  var fo = new FormatOptions();
  fo.tabSize = options.tabSize;
  fo.spaceAfterComma = true;
  
  var formatter = new Formatter();
  var text = document.getText();
  var formattedText = formatter.formatDocument(new TextStream(text), fo, SyntaxConfig.create(AssemblerType.GNU));

  var start = new Position(0, 0);
  var end = document.lineAt(document.lineCount-1).range.end;
  var range = new Range(start,  end);
  return [new TextEdit(range, formattedText)];
}
