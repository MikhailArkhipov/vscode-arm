// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import {
  TextDocument,
  SemanticTokens,
  SemanticTokensBuilder,
  Range,
  CancellationToken,
  SemanticTokensLegend,
} from 'vscode';
import { RDT } from './rdt';
import { ColorOptions } from './options';
import { TokenSubType, TokenType } from '../tokens/definitions';

const tokenTypes = [
  'instruction',
  'register',
  'directive',
  'declaration-directive',
  'definition-directive',
  'label',
  'number',
  'string',
  'operator',
  'comment',
  'variable',
];
export const semanticTokensLegend = new SemanticTokensLegend(tokenTypes, []);

export async function provideSemanticTokens(
  td: TextDocument,
  options: ColorOptions,
  ct: CancellationToken
): Promise<SemanticTokens | undefined> {
  const ed = RDT.getEditorDocument(td);
  if (!ed || !options.showColors) {
    return;
  }

  // on line 1, characters 1-5 are a class declaration
  const tokensBuilder = new SemanticTokensBuilder(semanticTokensLegend);
  // Do request AST so tokens get proper subtypes
  ed.getAst();

  for (let i = 0; i < ed.tokens.count && !ct.isCancellationRequested; i++) {
    let itemType: string | undefined;

    const t = ed.tokens.getItemAt(i);
    switch (t.type) {
      case TokenType.Label:
        itemType = 'label';
        break;

      case TokenType.Directive:
        switch (t.subType) {
          case TokenSubType.Definition:
            itemType = options.variables ? 'definition-directive' : 'directive';
            break;
          case TokenSubType.Declaration:
            itemType = options.variables ? 'declaration-directive' : 'directive';
            break;
          default:
            itemType = 'directive';
            break;
        }
        break;

      case TokenType.Symbol:
        switch (t.subType) {
          case TokenSubType.Instruction:
            itemType = 'instruction';
            break;
          case TokenSubType.Register:
            itemType = 'register';
            break;
          default:
            if (options.variables) {
              itemType = 'variable';
            }
            break;
        }
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
      tokensBuilder.push(range, itemType, []);
    }
  }
  return tokensBuilder.build();
}
