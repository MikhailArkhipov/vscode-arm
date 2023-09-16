// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import {
  ExtensionContext,
  languages,
  TextDocument,
  FormattingOptions,
  TextEdit,
  //CompletionItem,
  CancellationToken,
  //ProviderResult,
  TextEditor,
  window,
  workspace,
  commands,
} from 'vscode';
//import { provideHover } from './editor/hover';
import { formatDocument } from './editor/formatting';
//import { provideCompletions, resolveCompletionItem } from './editor/completions';
import { updateDiagnostics } from './editor/diagnostics';
import { RDT } from './editor/rdt';
import { openCurrentInstructionDocumenation } from './editor/commands';
import { provideSemanticTokens, semanticTokensLegend } from './editor/coloring';

const languageName = 'arm';

export async function activate(context: ExtensionContext) {
  // Register capabilities
  registerCapabilities(context);
  registerEditorEvents(context);
  registerCommands(context);
}

export async function deactivate(): Promise<void> {}

function registerCapabilities(context: ExtensionContext): void {
  context.subscriptions.push(
    // Formatter
    languages.registerDocumentFormattingEditProvider(languageName, {
      provideDocumentFormattingEdits(document: TextDocument, options: FormattingOptions): TextEdit[] {
        return formatDocument(document, options);
      },
    }),
    // Competions
    // languages.registerCompletionItemProvider(
    //   languageName,
    //   {
    //     provideCompletionItems(document, position, token, context): ProviderResult<CompletionItem[]> {
    //       return provideCompletions(document, position, context);
    //     },
    //     resolveCompletionItem(item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem> {
    //       return resolveCompletionItem(item, token);
    //     },
    //   },
    //   '.'
    // ),
    // // Hover tooltip
    // languages.registerHoverProvider(languageName, {
    //   provideHover(document, position, token) {
    //     return provideHover(document, position);
    //   },
    // }),
    // Colorizer
    languages.registerDocumentSemanticTokensProvider(
      { language: languageName, scheme: 'file' },
      {
        provideDocumentSemanticTokens(document: TextDocument, ct: CancellationToken) {
          return provideSemanticTokens(document, ct);
        },
      },
      semanticTokensLegend
    )
  );
}

function registerEditorEvents(context: ExtensionContext) {
  context.subscriptions.push(
    window.onDidChangeActiveTextEditor((e: TextEditor | undefined) => {
      if (!e) {
        return;
      }
      if (e !== undefined) {
        updateDiagnostics(e);
      }
    }),
    workspace.onDidOpenTextDocument((e: TextDocument) => {
      RDT.addTextDocument(e);
    }),
    workspace.onDidCloseTextDocument((e: TextDocument) => {
      RDT.removeTextDocument(e);
    })
  );

  workspace.textDocuments.forEach((e) => {
    if (e.languageId.toLowerCase() === languageName) {
      RDT.addTextDocument(e);
    }
  });
}

function registerCommands(context: ExtensionContext): void {
  context.subscriptions.push(
    commands.registerCommand('arm.openInstructionDocumentation', openCurrentInstructionDocumenation)
  );
}
