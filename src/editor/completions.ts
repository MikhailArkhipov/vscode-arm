// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { CancellationToken } from "vscode-languageclient";
import * as asmLang from "../asm-gas.json";
import {
  TextDocument,
  Position,
  CompletionContext,
  CompletionItem,
  CompletionItemKind,
} from "vscode";
import { getDirectiveDocumentation } from "./documentation";

export function provideCompletions(
  document: TextDocument,
  position: Position,
  context: CompletionContext
): CompletionItem[] {
  const directives = asmLang["directives-common"];
  const dirs = Object.keys(directives);
  const comps = dirs.map(
    (e) => new CompletionItem(e, CompletionItemKind.Keyword)
  );
  return comps;
}

export async function resolveCompletionItem(
  item: CompletionItem,
  token: CancellationToken
): Promise<CompletionItem> {
  if(item.kind === CompletionItemKind.Keyword) {
    // Directive
    item.documentation = await getDirectiveDocumentation(`.${item.label as string}`);
  }
  return item;
}
