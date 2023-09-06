// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as vscode from 'vscode';
import {
  ExtensionContext,
  languages,
  TextDocument,
  FormattingOptions,
  TextEdit,
  Disposable,
  CompletionItem,
  CancellationToken,
  ProviderResult,
  TextEditor,
} from "vscode";
import { provideHover } from "./editor/hover";
import { formatDocument } from "./editor/formatting";
import { provideCompletions, resolveCompletionItem } from "./editor/completions";
import { updateDiagnostics } from './editor/diagnostics';

const languageName = "arm";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: ExtensionContext) {
  context.subscriptions.push(
    languages.registerDocumentFormattingEditProvider(languageName, {
      provideDocumentFormattingEdits(
        document: TextDocument,
        options: FormattingOptions
      ): TextEdit[] {
        return formatDocument(document, options);
      },
    }),
    languages.registerCompletionItemProvider(
      languageName,
      {
        provideCompletionItems(
          document,
          position,
          token,
          context
        ): ProviderResult<CompletionItem[]> {
          return provideCompletions(document, position, context);
        },
        resolveCompletionItem(
          item: CompletionItem,
          token: CancellationToken
        ): ProviderResult<CompletionItem> {
          return resolveCompletionItem(item, token);
        },
      },
      "."
    ),
    languages.registerHoverProvider(languageName, {
      provideHover(document, position, token) {
        return provideHover(document, position);
      },
    }),
  );
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(
    (e: TextEditor | undefined) => {
        if (e !== undefined) {
            updateDiagnostics(e);
        }
    }));

}

export async function deactivate(): Promise<void> {
}

