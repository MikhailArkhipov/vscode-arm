// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { CancellationToken } from 'vscode-languageclient';
import * as asmDirectives from '../asm-directives-gas.json';
import * as asmInstuctions from '../arm-instructions.json';

import { TextDocument, Position, CompletionContext, CompletionItem, CompletionItemKind } from 'vscode';
import { getDirectiveDocumentation, getInstructionDocumentation } from './documentation';
import { RDT } from './rdt';
import { TokenType } from '../tokens/tokens';
import { Settings, getSetting } from './settings';
import { EditorDocument } from './document';

export function provideCompletions(td: TextDocument, position: Position, context: CompletionContext): CompletionItem[] {
  const ed = RDT.getEditorDocument(td);
  if (!ed) {
    return [];
  }

  const offset = td.offsetAt(position);
  const tokenIndex = ed.tokens.getItemContaining(offset);
  if (ed.isComment(tokenIndex)) {
    return [];
  }

  let comps = handleDirectivesCompletion(ed, offset, tokenIndex, context);
  if (comps.length === 0) {
    comps = handleInstructionsCompletion(ed, offset, tokenIndex, context);
  }

  return comps;
}

export async function resolveCompletionItem(item: CompletionItem, token: CancellationToken): Promise<CompletionItem> {
  if (item.kind === CompletionItemKind.Keyword) {
    // Directive
    item.documentation = await getDirectiveDocumentation(`.${item.label as string}`);
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
      directiveCompletion = ed.tokens.getItemAt(tokenIndex).tokenType === TokenType.Directive;
    }
  }

  if (!directiveCompletion) {
    // Are we past directive, full or partial like '.alig|'?
    const prevTokenIndex = ed.tokens.getFirstItemBeforePosition(offset);
    if (prevTokenIndex >= 0) {
      const prevToken = ed.tokens.getItemAt(prevTokenIndex);
      directiveCompletion = prevToken.tokenType === TokenType.Directive && prevToken.end === offset;
    }
  }

  if (directiveCompletion) {
    const dirs = Object.keys(asmDirectives['directives-common']);
    comps = dirs.map((e) => new CompletionItem(e, CompletionItemKind.Keyword));

    if (getSetting<boolean>(Settings.completionShowAdvancedDirectives, false)) {
      const dirs = Object.keys(asmDirectives['directives-advanced']);
      comps.push(...dirs.map((e) => new CompletionItem(e, CompletionItemKind.Keyword)));
    }
  }
  return comps;
}

function handleInstructionsCompletion(
  ed: EditorDocument,
  offset: number,
  tokenIndex: number,
  context: CompletionContext
): CompletionItem[] {
  const comps: CompletionItem[] = [];
  let ic = true;

  // Instruction must be either first token in line or right after a label.
  if (tokenIndex >= 0) {
    ic = ed.tokens.getItemAt(tokenIndex).tokenType === TokenType.Instruction;
  } else {
    const prevTokenIndex = ed.tokens.getFirstItemBeforePosition(offset);
    ic = prevTokenIndex < 0;
    if (!ic) {
      const prevToken = ed.tokens.getItemAt(prevTokenIndex);
      ic =
        prevToken.tokenType === TokenType.EndOfLine ||
        prevToken.tokenType === TokenType.Label ||
        (prevToken.tokenType === TokenType.Instruction && prevToken.end === offset);
    }
  }

  if (!ic) {
    return comps;
  }

  const instrBaseNames = Object.keys(asmInstuctions.instructions);
  instrBaseNames.forEach((baseName) => {
    const data = asmInstuctions[baseName];
    const baseDoc = getInstructionDocumentation(baseName);

    const suffix = data['suffix'] as string;
    if (suffix) {
      const items = suffix.split(' ');
      items.forEach((i) => {
        const ci = new CompletionItem(baseName + i, CompletionItemKind.Method);
        ci.documentation = baseDoc;
        comps.push(ci);
      });
    } else {
      const ci = new CompletionItem(baseName, CompletionItemKind.Method);
      ci.documentation = baseDoc;
      comps.push(ci);
    }
  });

  return comps;
}
