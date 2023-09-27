// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as asmDirectives from '../instruction_sets/directives-gas.json';
import { CancellationToken } from 'vscode-languageclient';

import { TextDocument, Position, CompletionContext, CompletionItem, CompletionItemKind } from 'vscode';
import { getDirectiveDocumentation } from '../documentation/documentation';
import { RDT } from './rdt';
import { Token, TokenType } from '../tokens/tokens';
import { EditorDocument } from './document';
import { Settings, getSetting } from '../core/settings';
import { getAvailableInstructions, waitForInstructionSetLoadingComplete } from '../instructions/instructionSet';

export async function provideCompletions(
  td: TextDocument,
  position: Position,
  context: CompletionContext,
  ct: CancellationToken
): Promise<CompletionItem[]> {
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
    comps = await handleInstructionsCompletion(ed, offset, tokenIndex, ct);
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

  // Explicit trigger always invokes
  let directiveCompletion = context.triggerCharacter === '.';
  if (!directiveCompletion) {
    if (tokenIndex >= 0) {
      // Explicit invoke like Ctrl+Space? Are we on an existing directive?
      directiveCompletion = ed.tokens.getItemAt(tokenIndex).type === TokenType.Directive;
    }
  }

  if (!directiveCompletion) {
    // Are we past directive, full or partial like '.alig|'?
    const prevTokenIndex = ed.tokens.getFirstItemBeforePosition(offset);
    if (prevTokenIndex >= 0) {
      const prevToken = ed.tokens.getItemAt(prevTokenIndex);
      directiveCompletion = prevToken.type === TokenType.Directive && prevToken.end === offset;
    }
  }

  if (directiveCompletion) {
    const uc = getSetting<boolean>(Settings.formattingUpperCaseDirectives, true);

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

async function handleInstructionsCompletion(
  ed: EditorDocument,
  offset: number,
  tokenIndex: number,
  ct: CancellationToken
): Promise<CompletionItem[]> {
  const comps: CompletionItem[] = [];

  await waitForInstructionSetLoadingComplete();
  const instructions = await getAvailableInstructions();
  if (ct.isCancellationRequested) {
    return [];
  }

  const uc = getSetting<boolean>(Settings.formattingUpperCaseInstructions, true);
  instructions.forEach((i) => {
    const ci = new CompletionItem(uc ? i.name.toUpperCase() : i.name.toLowerCase(), CompletionItemKind.Method);
    ci.documentation = i.doc;
    comps.push(ci);
  });

  return comps;
}
