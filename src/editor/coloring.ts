// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import {
  TextDocument,
  SemanticTokens,
  SemanticTokensBuilder,
  Range,
  CancellationToken,
  SemanticTokensLegend,
  Position,
} from 'vscode';
import { RDT } from './rdt';
import { ColorOptions } from './options';
import { TokenSubType, TokenType } from '../tokens/definitions';
import { TextRange } from '../text/definitions';

const tokenTypes = [
  'instruction',
  'register',
  'directive',
  'declaration',
  'definition',
  'include',
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
    let itemType = '';

    const t = ed.tokens.getItemAt(i);
    switch (t.type) {
      case TokenType.Label:
        itemType = 'label';
        break;

      case TokenType.Directive:
        switch (t.subType) {
          case TokenSubType.Definition:
            itemType = options.variables ? 'definition' : 'directive';
            break;
          case TokenSubType.Declaration:
            itemType = options.variables ? 'declaration' : 'directive';
            break;
          default:
            itemType = ed.getTokenText(t) === '.include' ? 'include' : 'directive';
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
            itemType = 'variable';
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

    if (itemType.length > 0) {
      // Apparently, VS Code is unable to handle colorable ranges
      // longer than a single line. We need to split token into multiple
      // before feeding the token builder.
      const ranges = splitRange(td, t);
      ranges.forEach((r) => {
        tokensBuilder.push(r, itemType, []);
      });
    }
  }
  return tokensBuilder.build();
}

function splitRange(td: TextDocument, t: TextRange): readonly Range[] {
  const startPos = td.positionAt(t.start);
  const endPos = td.positionAt(t.end);
  if (startPos.line === endPos.line) {
    return [new Range(startPos, endPos)];
  }
  const ranges: Range[] = [];
  // Push first range
  ranges.push(new Range(startPos, new Position(startPos.line, td.lineAt(startPos.line).range.end.character)));
  // Push complete ranges that are in the middle
  for (let i = startPos.line + 1; i < endPos.line; i++) {
    ranges.push(td.lineAt(i).range);
  }
  // Push final range
  ranges.push(new Range(new Position(endPos.line, 0), endPos));
  return ranges;
}
