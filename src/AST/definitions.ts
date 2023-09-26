// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { LanguageOptions } from '../core/languageOptions';
import { ParseContext } from '../parser/parseContext';
import { TextProvider } from '../text/text';
import { TextRange } from '../text/textRange';
import { TextRangeCollection } from '../text/textRangeCollection';
import { Token } from '../tokens/tokens';

export interface AstNode extends TextRange {
  parent: AstNode | undefined;
  readonly children: TextRangeCollection<AstNode>;

  appendChild(node: AstNode): void;

  // Finds deepest node that contains given position
  nodeFromPosition(position: number): AstNode | undefined;
  // Finds deepest element node that fully encloses given range
  nodeFromRange(range: TextRange): AstNode | undefined;
}

export namespace AstNode {
  export function getRoot(node: AstNode | undefined): AstNode | undefined {
    if (!node) {
      return;
    }
    while (node && node.parent !== node) {
      node = node.parent;
    }
    return node;
  }
}

export interface TokenNode extends AstNode {
  get token(): Token;
}

// https://ftp.gnu.org/old-gnu/Manuals/gas-2.9.1/html_chapter/as_6.html#SEC60
export const enum OperatorType {
  Unknown,
  Add,
  Subtract,
  Multiply,
  Divide,
  Modulo, // %
  ShiftLeft, // <<
  ShiftRight, // >>
  Not, // !
  And, // &
  Or, // |
  Xor, // ^
  UnaryMinus,
  UnaryPlus,
  Group, // ( ) pseudo-operator
  Sentinel, // pseudo-type used in expression parsing
}

// https://en.wikipedia.org/wiki/Operator_associativity
// Operator associativity. Consider the expression a~b~c. If the operator
// ~ has left associativity, this expression would be interpreted as (a~b)~c.
// If the operator has right associativity, the expression would be
// interpreted as a~(b~c).
export const enum Associativity {
  // Left associativity, the expression is interpreted as (a~b)~c
  Left,
  // Right associativity, the expression is interpreted as a~(b~c)
  Right,
}

export interface Operator extends TokenNode {
  get type(): OperatorType;
  get precedence(): number;
  get associativity(): Associativity;
  get unary(): boolean;
  get leftOperand(): AstNode | undefined;
  get rightOperand(): AstNode | undefined;
}

export interface Expression extends AstNode {
  get content(): AstNode | undefined;
}

export interface Group extends AstNode {
  get openBrace(): TokenNode;
  get content(): Expression | undefined;
  get closeBrace(): TokenNode | undefined;
}

export interface CommaSeparatedItem extends AstNode {
  get expression(): Expression | undefined;
  get comma(): TokenNode | undefined;
}

export interface CommaSeparatedList extends AstNode {
  get openBrace(): TokenNode | undefined;
  get items(): TextRangeCollection<CommaSeparatedItem>;
  get closeBrace(): TokenNode | undefined;
}

export enum StatementType {
  Unknown = 0,
  Empty = 1,
  Directive = 2,
  Instruction = 3,
}

export enum StatementSubType {
  None = 0,
  SymbolDefinition = 1, // name .equ expression
  VariableDeclaration = 2, // name: .word 0
}

export interface Statement extends AstNode {
  get type(): StatementType;
  get subType(): StatementSubType;
  get label(): TokenNode | undefined;
  get name(): TokenNode | undefined;
  get symbolName(): TokenNode | undefined;
  get operands(): CommaSeparatedList;
}

export function isTokenNode(node: AstNode | undefined): node is TokenNode {
  const tn = node as TokenNode;
  return tn && tn.token !== undefined;
}

export interface AstRoot extends AstNode {
  get context(): ParseContext;
  get text(): TextProvider;
  get options(): LanguageOptions;
  get labels(): readonly Token[];
  get statements(): readonly Statement[];
}
