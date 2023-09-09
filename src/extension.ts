// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as vscode from "vscode";
import {
  ExtensionContext,
  languages,
  TextDocument,
  FormattingOptions,
  TextEdit,
  CompletionItem,
  CancellationToken,
  ProviderResult,
  TextEditor,
} from "vscode";
import { provideHover } from "./editor/hover";
import { formatDocument } from "./editor/formatting";
import {
  provideCompletions,
  resolveCompletionItem,
} from "./editor/completions";
import { updateDiagnostics } from "./editor/diagnostics";
import { RDT } from "./editor/rdt";

const languageName = "arm";
//const completionTriggers = ".abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export async function activate(context: ExtensionContext) {
  // Register capabilities
  registerCapabilities(context);
  registerEditorEvents(context);
}

export async function deactivate(): Promise<void> {}

function registerCapabilities(context: ExtensionContext): void {
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
    })
  );
}

function registerEditorEvents(context: ExtensionContext) {
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((e: TextEditor | undefined) => {
      if (!e) {
        return;
      }
      if (e !== undefined) {
        updateDiagnostics(e);
      }
    }),
    vscode.workspace.onDidOpenTextDocument((e: TextDocument) => {
      RDT.addTextDocument(e);
    }),
    vscode.workspace.onDidCloseTextDocument((e: TextDocument) => {
      RDT.removeTextDocument(e);
    })
  );

  vscode.workspace.textDocuments.forEach((e) => {
    if (e.languageId.toUpperCase() === "ARM") {
      RDT.addTextDocument(e);
    }
  });
}
