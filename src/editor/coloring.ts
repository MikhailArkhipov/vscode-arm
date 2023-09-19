// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import {
  TextDocument,
  ProviderResult,
  SemanticTokens,
  SemanticTokensBuilder,
  Range,
  CancellationToken,
  SemanticTokensLegend,
} from 'vscode';
import { RDT } from './rdt';
import { TokenType } from '../tokens/tokens';
import { Settings, getSetting } from '../core/settings';

const tokenTypes = ['instruction', 'directive', 'register', 'label', 'comment', 'number', 'string', 'operator'];
const tokenModifiers = [];
export const semanticTokensLegend = new SemanticTokensLegend(tokenTypes, tokenModifiers);

export function provideSemanticTokens(td: TextDocument, ct: CancellationToken): ProviderResult<SemanticTokens> {
  const ed = RDT.getEditorDocument(td);
  if (!ed || !getSetting<boolean>(Settings.showColors, true)) {
    return;
  }
  // on line 1, characters 1-5 are a class declaration
  const tokensBuilder = new SemanticTokensBuilder(semanticTokensLegend);
  for (let i = 0; i < ed.tokens.count && !ct.isCancellationRequested; i++) {
    let itemType: string | undefined;

    const t = ed.tokens.getItemAt(i);
    switch (t.tokenType) {
      case TokenType.Label:
        itemType = 'label';
        break;

      case TokenType.Directive:
        itemType = 'directive';
        break;

      case TokenType.Instruction:
        itemType = 'instruction';
        break;
      case TokenType.Register:
        itemType = 'register';
        break;

      case TokenType.LineComment:
      case TokenType.BlockComment:
        itemType = 'comment';
        break;

      case TokenType.String:
        itemType = 'string';
        break;

      case TokenType.Operator:
        itemType = 'operator';
        break;
      case TokenType.Number:
        itemType = 'number';
        break;
    }

    if (itemType) {
      const range = new Range(td.positionAt(t.start), td.positionAt(t.end));
      tokensBuilder.push(range, itemType, tokenModifiers);
    }
  }
  return tokensBuilder.build();
}
