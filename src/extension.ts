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
  ProviderResult,
  Range,
} from 'vscode';
import { provideHover } from './editor/hover';
import { RDT } from './editor/rdt';
import { openCurrentItemDocumentation } from './editor/commands';
import { provideSemanticTokens, semanticTokensLegend } from './editor/coloring';
import { setExtensionPath } from './core/utility';
import { IdleTime } from './core/idletime';
import { provideCompletions, resolveCompletionItem } from './editor/completions';
import { Formatter } from './editor/formatter';
import { ColorOptions, getColorOptions } from './editor/options';
import { getFormatOptions } from './editor/document';

const languageName = 'arm';
let colorOptions: ColorOptions;
let _deactivated = false;

export async function activate(context: ExtensionContext): Promise<void> {
  setExtensionPath(context.extensionPath);
  colorOptions = getColorOptions();

  // Register capabilities
  registerCapabilities(context);
  registerEditorEvents(context);
  registerCommands(context);
}

export async function deactivate(): Promise<void> {
  _deactivated = true;
}

function registerCapabilities(context: ExtensionContext): void {
  context.subscriptions.push(
    // Formatter
    languages.registerDocumentFormattingEditProvider(languageName, {
      provideDocumentFormattingEdits(document: TextDocument, options: FormattingOptions): TextEdit[] {
        return formatDocument(document, options);
      },
    }),
    // Completions
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
          return provideSemanticTokens(document, colorOptions, ct);
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
    }),
    workspace.onDidChangeConfiguration((e) => {
      onSettingsChange();
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
    commands.registerCommand('arm.openCurrentItemDocumentation', openCurrentItemDocumentation)
    // commands.registerCommand('arm.convertHtmlToIndex', convertHtmlToIndex)
  );
}

function onSettingsChange(): void {
  if (!_deactivated) {
    colorOptions = getColorOptions();
  }
}

function formatDocument(td: TextDocument, vsCodeFormattingOptions: FormattingOptions): TextEdit[] {
  const ed = RDT.getEditorDocument(td);
  if (!ed) {
    return [];
  }

  ed.getAst();
  const formatter = new Formatter();
  const documentText = td.getText();
  const tokens = ed.tokens.asArray();

  const fo = getFormatOptions(documentText, tokens);
  fo.tabSize = vsCodeFormattingOptions.tabSize;

  const formattedText = formatter.formatDocument(documentText, fo);
  const range = new Range(td.positionAt(0), td.positionAt(documentText.length));

  return [new TextEdit(range, formattedText)];
}
