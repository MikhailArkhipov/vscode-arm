// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import {
  CancellationToken,
  CompletionTriggerKind,
} from "vscode-languageclient";
import * as asmDirectives from "../asm-directives-gas.json";
import * as asmInstuctions from "../arm-instructions.json";

import {
  TextDocument,
  Position,
  CompletionContext,
  CompletionItem,
  CompletionItemKind,
} from "vscode";
import { getDirectiveDocumentation } from "./documentation";
import { RDT } from "./rdt";
import { Token, TokenType } from "../tokens/tokens";
import { Settings, getSetting } from "./settings";
import { EditorDocument } from "./document";
import { Char, Character } from "../text/charCodes";
import { off } from "process";

export function provideCompletions(
  td: TextDocument,
  position: Position,
  context: CompletionContext
): CompletionItem[] {
  const ed = RDT.getEditorDocument(td);
  if (!ed) {
    return [];
  }

  const offset = td.offsetAt(position);
  const tokenIndex = ed.tokens.getItemContaining(offset);
  if (isPositionInComment(ed, tokenIndex)) {
    return [];
  }

  let comps = handleDirectivesCompletion(ed, tokenIndex, context);
  if (comps.length === 0) {
    comps = handleInstructionsCompletion(ed, offset, tokenIndex, context);
  }

  return comps;
}

export async function resolveCompletionItem(
  item: CompletionItem,
  token: CancellationToken
): Promise<CompletionItem> {
  if (item.kind === CompletionItemKind.Keyword) {
    // Directive
    item.documentation = await getDirectiveDocumentation(
      `.${item.label as string}`
    );
  }
  return item;
}

function isPositionInComment(ed: EditorDocument, tokenIndex: number): boolean {
  // Locate matching document in RDT
  if (tokenIndex >= 0) {
    const t = ed.tokens.getItemAt(tokenIndex);
    return (
      t.tokenType === TokenType.LineComment ||
      t.tokenType === TokenType.BlockComment
    );
  }
  return false;
}

function handleDirectivesCompletion(
  ed: EditorDocument,
  tokenIndex: number,
  context: CompletionContext
): CompletionItem[] {
  let comps: CompletionItem[] = [];
  let directiveCompletion = false;

  if (
    context.triggerKind === CompletionTriggerKind.Invoked &&
    tokenIndex >= 0
  ) {
    // Explicit invoke like Ctrl+Space
    directiveCompletion =
      ed.tokens.getItemAt(tokenIndex).tokenType === TokenType.Directive;
  } else {
    directiveCompletion = context.triggerCharacter === ".";
  }

  if (directiveCompletion) {
    const dirs = Object.keys(asmDirectives["directives-common"]);
    comps = dirs.map((e) => new CompletionItem(e, CompletionItemKind.Keyword));

    if (getSetting<boolean>(Settings.completionShowAdvancedDirectives, false)) {
      const dirs = Object.keys(asmDirectives["directives-advanced"]);
      comps.push(
        ...dirs.map((e) => new CompletionItem(e, CompletionItemKind.Keyword))
      );
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
  let comps: CompletionItem[] = [];
  let instructionCompletion = true;

  // Instruction must be either first token in line or right after a label.
  if (tokenIndex >= 0) {
    instructionCompletion =
      ed.tokens.getItemAt(tokenIndex).tokenType === TokenType.Instruction;
  } else {
    const prevTokenIndex = ed.tokens.getFirstItemBeforePosition(offset);
    instructionCompletion = prevTokenIndex < 0;
    if (!instructionCompletion) {
      const prevToken = ed.tokens.getItemAt(prevTokenIndex);
      instructionCompletion =
        prevToken.tokenType === TokenType.EndOfLine ||
        prevToken.tokenType === TokenType.Label ||
        (prevToken.tokenType === TokenType.Instruction &&
          prevToken.end === offset);
    }
  }

  if (instructionCompletion) {
    const dirs = Object.keys(asmInstuctions.instructions);
    comps = dirs.map((e) => new CompletionItem(e, CompletionItemKind.Method));
  }
  return comps;
}
