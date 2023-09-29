// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.
import * as path from 'path';
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
import { openCurrentInstructionDocumenation } from './editor/commands';
import { provideSemanticTokens, semanticTokensLegend } from './editor/coloring';
import { getExtensionPath, setExtensionPath } from './core/utility';
import { convertHtmlToIndex } from './instructions';
import { IdleTime } from './core/idletime';
import { provideCompletions, resolveCompletionItem } from './editor/completions';
import { Settings, getSetting } from './core/settings';
import { loadInstructionSet } from './instructions/instructionSet';
import { Formatter } from './editor/formatter';
import { ColorOptions, getColorOptions, getFormatOptions } from './editor/options';

const languageName = 'arm';
let colorOptions: ColorOptions;

export async function activate(context: ExtensionContext): Promise<void> {
  setExtensionPath(context.extensionPath);
  // don't wait here, let it run async
  loadInstructionSetFromSettings();
  colorOptions = getColorOptions();

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
        return formatDocument(document);
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
    commands.registerCommand('arm.openInstructionDocumentation', openCurrentInstructionDocumenation),
    commands.registerCommand('arm.convertHtmlToIndex', convertHtmlToIndex)
  );
}

function onSettingsChange(): void {
  colorOptions = getColorOptions();
  loadInstructionSetFromSettings();
}

function loadInstructionSetFromSettings(): void {
  const setFolder = path.join(getExtensionPath(), 'src', 'instruction_sets');
  const setName = getSetting<string>(Settings.instructionSet, 'A64');
  loadInstructionSet(setFolder, setName);
}

function formatDocument(td: TextDocument): TextEdit[] {
  const ed = RDT.getEditorDocument(td);
  if (!ed) {
    return [];
  }

  const formatter = new Formatter();
  const text = td.getText();
  const fo = getFormatOptions();
  const formattedText = formatter.formatDocument(text, ed.tokens.asArray(), fo);

  const end = td.lineAt(td.lineCount - 1).range.end;
  const range = new Range(td.positionAt(0), td.positionAt(text.length));
  return [new TextEdit(range, formattedText)];
}
