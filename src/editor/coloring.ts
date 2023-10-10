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
  'comment',
  'number',
  'string',
  'operator',
  'label',
  'instruction',
  'directive',
  'register',
  'variable',
];
const enum ColorToken {
  Comment = 0,
  Number = 1,
  String = 2,
  Operator = 3,
  Label = 4,
  Instruction = 5,
  Directive = 6,
  Register = 7,
  Variable = 8,
}

const tokenModifiers = [
  'definition',
  'declaration',
  'include',
  'condition',
  'macro',
  'macroName',
  'macroParameter',
  'unrecognized',
];
const enum ColorModifier {
  Definition = 1,
  Declaration = 2,
  Include = 4,
  Condition = 8,
  Macro = 16,
  MacroName = 32,
  MacroParameter = 64,
  Unrecognized = 128,
}

export const semanticTokensLegend = new SemanticTokensLegend(tokenTypes, tokenModifiers);

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
    let itemColor = -1;
    let itemModifier = 0;

    const t = ed.tokens.getItemAt(i);
    switch (t.type) {
      case TokenType.Label:
        itemColor = ColorToken.Label;
        break;

      case TokenType.Directive:
        itemColor = ColorToken.Directive;
        switch (t.subType) {
          case TokenSubType.Definition:
            itemModifier = ColorModifier.Definition;
            break;
          case TokenSubType.Declaration:
            itemModifier = ColorModifier.Declaration;
            break;
          case TokenSubType.BeginMacro:
          case TokenSubType.EndMacro:
            itemModifier = ColorModifier.Macro;
            break;
          case TokenSubType.BeginCondition:
          case TokenSubType.EndCondition:
            itemModifier = ColorModifier.Condition;
            break;
          case TokenSubType.Include:
            itemModifier = ColorModifier.Include;
            break;
        }
        break;

      case TokenType.Symbol:
        switch (t.subType) {
          case TokenSubType.Instruction:
            itemColor = ColorToken.Instruction;
            break;
          case TokenSubType.Register:
            itemColor = ColorToken.Register;
            break;
          case TokenSubType.MacroName:
            itemColor = ColorToken.Variable;
            itemModifier = ColorModifier.MacroName;
            break;
          case TokenSubType.MacroParameter:
            itemColor = ColorToken.Variable;
            itemModifier = ColorModifier.MacroParameter;
            break;
          case TokenSubType.MacroLabelReference:
            itemColor = ColorToken.Label;
          default:
            // First item in line after label normally is
            // an instruction or a macro call.
            if (
              i > 0 &&
              (ed.tokens.getItemAt(i - 1).type === TokenType.Label ||
                ed.tokens.getItemAt(i - 1).type === TokenType.EndOfLine ||
                ed.tokens.getItemAt(i - 1).type === TokenType.EndOfStream)
            ) {
              itemColor = ColorToken.Instruction;
              itemModifier = ColorModifier.Unrecognized;
            } else {
              itemColor = ColorToken.Variable;
            }
            break;
        }
        break;

      case TokenType.LineComment:
      case TokenType.BlockComment:
        itemColor = ColorToken.Comment;
        break;

      case TokenType.String:
        itemColor = ColorToken.String;
        break;
      case TokenType.Operator:
        itemColor = ColorToken.Operator;
        break;
      case TokenType.Number:
        itemColor = ColorToken.Number;
        break;
    }

    if (itemColor >= 0) {
      // Apparently, VS Code is unable to handle colorable ranges
      // longer than a single line. We need to split token into multiple
      // before feeding the token builder.
      const ranges = splitRange(td, t);
      ranges.forEach((r) => {
        tokensBuilder.push(
          r.start.line,
          r.start.character,
          r.end.character - r.start.character,
          itemColor,
          itemModifier
        );
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
