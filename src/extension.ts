// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as asmLang from "./asm-gas.json";

import {
  ExtensionContext,
  languages,
  TextDocument,
  FormattingOptions,
  TextEdit,
  Disposable,
  Range,
  Position,
  CompletionContext,
  Hover,
  MarkdownString,
  CompletionItem,
  CompletionItemKind,
} from "vscode";
import { FormatOptions, Formatter } from "./format/formatter";
import { AssemblerType, SyntaxConfig } from "./syntaxConfig";
import { TextStream } from "./text/textStream";
import { HttpClient, HttpClientResponse } from "typed-rest-client/HttpClient";
import { AstRoot } from "./AST/astRoot";
import { Parser } from "./parser/parser";
import { Tokenizer } from "./tokens/tokenizer";
import { TokenType } from "./tokens/tokens";

const languageName = "arm";
const disposables: Disposable[] = [];
const config = SyntaxConfig.create(AssemblerType.GNU);
const TurndownService = require("turndown");

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
        provideCompletionItems(document, position, token, context) {
          return provideCompletions(document, position, context);
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

// Formatting ===========================
function formatDocument(
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

// Completions ===========================
function provideCompletions(
  document: TextDocument,
  position: Position,
  context: CompletionContext
): CompletionItem[] {
  const directives = asmLang["directives-common"];
  const dirs = Object.keys(directives);
  const comps = dirs.map(
    (e) => new CompletionItem(e, CompletionItemKind.EnumMember)
  );
  return comps;
}

// Hover ===========================
async function provideHover(
  document: TextDocument,
  position: Position
): Promise<Hover> {
  const nextLine = Math.min(position.line + 1, document.lineCount - 1);
  const start = new Position(0, 0);
  const end = document.lineAt(nextLine).range.end;
  const range = new Range(start, end);
  const text = document.getText(range);
  const pt = document.offsetAt(position);

  const t = new Tokenizer(config);
  const tokens = t.tokenize(new TextStream(text), 0, text.length, false).tokens;

  const index = tokens.getItemContaining(pt);
  if (index >= 0) {
    const token = tokens.getItemAt(index);
    if (token.tokenType === TokenType.Directive) {
      var doc = await getDirectiveDocumentation(
        text.substring(token.start, token.end)
      );
      if (doc) {
        return new Hover(doc);
      }
    }
  }
  return new Hover("");
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

async function getDirectiveDocumentation(
  directiveName: string
): Promise<MarkdownString | undefined> {
  // TODO: caching
  const baseUrl = "https://sourceware.org/binutils/docs/as";
  directiveName = directiveName.replace("_", "_005");
  directiveName = `${directiveName
    .charAt(1)
    .toUpperCase()}${directiveName.substring(2)}`;
  const docUrl = `${baseUrl}/${directiveName}.html`;

  try {
    const client = new HttpClient("vscode-arm");
    const response = await client.get(docUrl);
    if (response.message.statusCode !== 200) {
      return;
    }

    const content = await response.readBody();
    const turndownService = new TurndownService();
    const markdown = turndownService.turndown(content);
    return markdown;
  } catch {}
}
