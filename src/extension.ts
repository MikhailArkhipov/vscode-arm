// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import {
  ExtensionContext,
  languages,
  TextDocument,
  FormattingOptions,
  TextEdit,
  Disposable,
  Position,
  CompletionItem,
  CancellationToken,
  ProviderResult,
} from "vscode";
import { AssemblerType, SyntaxConfig } from "./syntaxConfig";
import { TextStream } from "./text/textStream";
import { AstRoot } from "./AST/astRoot";
import { Parser } from "./parser/parser";
import { provideHover } from "./editor/hover";
import { formatDocument } from "./editor/formatting";
import { provideCompletions, resolveCompletionItem } from "./editor/completions";

const languageName = "arm";
const disposables: Disposable[] = [];
const config = SyntaxConfig.create(AssemblerType.GNU);

let ast: AstRoot | undefined;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: ExtensionContext) {
  disposables.push(
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

export async function deactivate(): Promise<void> {
  disposables.forEach((d) => d.dispose());
}

// TODO: validation/diagnostics
// TODO: folding on .if-.endif, .macro/.endm, ...

function getTokenByPosition(document: TextDocument, position: Position) {}

function getAst(document: TextDocument): AstRoot {
  if (ast && ast.context.version === document.version) {
    return ast;
  }
  var p = new Parser();
  ast = p.parse(new TextStream(document.getText()), config, document.version);
  return ast;
}
