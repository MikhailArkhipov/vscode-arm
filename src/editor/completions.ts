// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as asmDirectives from '../instruction_sets/directives-gas.json';
import { TextDocument, Position, CompletionContext, CompletionItem, CompletionItemKind, CancellationToken } from 'vscode';
import { getDirectiveDocumentation } from './documentation';
import { RDT } from './rdt';
import { EditorDocument } from './document';
import { Settings, getSetting } from '../core/settings';
import { getAvailableInstructions } from '../instructions/instructionSet';
import { Token, TokenType } from '../tokens/definitions';

export function provideCompletions(
  td: TextDocument,
  position: Position,
  context: CompletionContext,
  ct: CancellationToken
): CompletionItem[] {
  const ed = RDT.getEditorDocument(td);
  if (!ed) {
    return [];
  }

  const offset = td.offsetAt(position);
  const tokenIndex = ed.tokens.getItemContaining(offset);
  if (tokenIndex >= 0 && Token.isComment(ed.tokens.getItemAt(tokenIndex))) {
    return [];
  }

  let comps = handleDirectivesCompletion(ed, offset, tokenIndex, context);
  if (comps.length === 0) {
    comps = handleInstructionsCompletion(ed, ct);
  }

  return comps;
}

export async function resolveCompletionItem(item: CompletionItem, ct: CancellationToken): Promise<CompletionItem> {
  if (item.kind === CompletionItemKind.Keyword) {
    // Directive
    item.documentation = await getDirectiveDocumentation(`.${item.label as string}`, ct);
  }
  return item;
}

function handleDirectivesCompletion(
  ed: EditorDocument,
  offset: number,
  tokenIndex: number,
  context: CompletionContext
): CompletionItem[] {
  let comps: CompletionItem[] = [];

  const ast = ed.getAst();
  if (!ast) {
    return [];
  }

  // Explicit trigger always invokes
  let directiveCompletion = context.triggerCharacter === '.';
  if (!directiveCompletion) {
    if (tokenIndex >= 0) {
      // Explicit invoke like Ctrl+Space? Are we on an existing directive?
      directiveCompletion = ast.tokens.getItemAt(tokenIndex).type === TokenType.Directive;
    }
  }

  if (!directiveCompletion) {
    // Are we past directive, full or partial like '.alig|'?
    const prevTokenIndex = ast.tokens.getFirstItemBeforePosition(offset);
    if (prevTokenIndex >= 0) {
      const prevToken = ast.tokens.getItemAt(prevTokenIndex);
      directiveCompletion = prevToken.type === TokenType.Directive && prevToken.end === offset;
    }
  }

  if (directiveCompletion) {
    const uc = ed.formatOptions?.uppercaseDirectives;

    const dirs = Object.keys(asmDirectives['directives-common']);
    comps = dirs.map((e) => new CompletionItem(uc ? e.toUpperCase() : e.toLowerCase(), CompletionItemKind.Keyword));

    if (getSetting<boolean>(Settings.completionShowAdvancedDirectives, false)) {
      const dirs = Object.keys(asmDirectives['directives-advanced']);
      comps.push(
        ...dirs.map((e) => new CompletionItem(uc ? e.toUpperCase() : e.toLowerCase(), CompletionItemKind.Keyword))
      );
    }
  }
  return comps;
}

function handleInstructionsCompletion(ed: EditorDocument, ct: CancellationToken): CompletionItem[] {
  const instructions = getAvailableInstructions(ed.instructionSet);
  if (ct.isCancellationRequested) {
    return [];
  }

  const uc = ed.formatOptions?.uppercaseInstructions;
  const comps: CompletionItem[] = [];

  instructions.forEach((i) => {
    const ci = new CompletionItem(uc ? i.name.toUpperCase() : i.name.toLowerCase(), CompletionItemKind.Method);
    ci.documentation = i.doc;
    comps.push(ci);
  });

  return comps;
}
