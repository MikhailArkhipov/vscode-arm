// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import {
  ExtensionContext,
  languages,
  TextDocument,
  FormattingOptions,
  TextEdit,
  CompletionItem,
  CancellationToken,
  workspace,
  commands,
  CancellationTokenSource,
  ProviderResult,
} from 'vscode';
import { provideHover } from './editor/hover';
import { formatDocument } from './editor/formatting';
import { RDT } from './editor/rdt';
import { openCurrentInstructionDocumenation } from './editor/commands';
import { provideSemanticTokens, semanticTokensLegend } from './editor/coloring';
import { setExtensionPath } from './core/utility';
import { loadInstructionSet } from './instructions/instructionSet';
import { convertHtmlToIndex } from './instructions';
import { IdleTime } from './core/idletime';
import { provideCompletions, resolveCompletionItem } from './editor/completions';

const languageName = 'arm';

export async function activate(context: ExtensionContext): Promise<void> {
  setExtensionPath(context.extensionPath);
  // don't wait here, let it run async
  loadInstructionSet(new CancellationTokenSource().token); 

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
    languages.registerCompletionItemProvider(
      languageName,
      {
        provideCompletionItems(document, position, token, context): ProviderResult<CompletionItem[]> {
          return provideCompletions(document, position, context, token);
        },
        resolveCompletionItem(item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem> {
          return resolveCompletionItem(item, token);
        },
      },
      '.'
    ),
    // Hover tooltip
    languages.registerHoverProvider(languageName, {
      provideHover(document, position, token) {
        return provideHover(document, position, token);
      },
    }),
    // Colorizer
    languages.registerDocumentSemanticTokensProvider(
      { language: languageName, scheme: 'file' },
      {
        provideDocumentSemanticTokens(document: TextDocument, ct: CancellationToken) {
          IdleTime.notifyEditorTextChanged();
          return provideSemanticTokens(document, ct);
        },
      },
      semanticTokensLegend
    )
  );
}

function registerEditorEvents(context: ExtensionContext) {
  context.subscriptions.push(
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
    commands.registerCommand('arm.openInstructionDocumentation', openCurrentInstructionDocumenation),
    commands.registerCommand('arm.convertHtmlToIndex', convertHtmlToIndex),
  );
}
