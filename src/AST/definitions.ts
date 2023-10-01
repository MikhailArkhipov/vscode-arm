// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { LanguageOptions } from '../core/languageOptions';
import { TextProvider, TextRange, TextRangeCollection } from '../text/definitions';
import { Token } from '../tokens/definitions';

export interface NodeCollection extends TextRangeCollection<AstNode> {}

export interface AstNode extends TextRange {
  parent: AstNode | undefined;
  readonly children: NodeCollection;

  appendChild(node: AstNode): void;

  // Finds deepest node that contains given position
  nodeFromPosition(position: number): AstNode | undefined;
  // Finds deepest element node that fully encloses given range
  nodeFromRange(range: TextRange, inclusiveEnd?: boolean): AstNode | undefined;
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
  Unknown = 0,
  Add = 1,
  Subtract = 2,
  Multiply = 3,
  Divide = 4,
  Modulo = 5, // %
  ShiftLeft = 6, // <<
  ShiftRight = 7, // >>
  Not = 8, // !
  And = 9, // &
  Or = 10, // |
  Xor = 11, // ^
  UnaryMinus = 12,
  UnaryPlus = 13,
  Group = 15, // ( ) pseudo-operator
  Sentinel = 16, // pseudo-type used in expression parsing

  // Thefollowing operators are not important in this parser
  // as it is only for coloring and completion/tooltips.
  // No need to parse them and include in the AST.

  // Writeback = 14, // r4! writeback
  // Address = 15,  // = as in LDR r2,=place
  // Caret = 16,    // {pc}^
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

export interface Operator extends AstNode {
  get type(): OperatorType;
  get precedence(): number;
  get associativity(): Associativity;
  get unary(): boolean;
  get leftOperand(): AstNode | undefined;
  get rightOperand(): AstNode | undefined;
}

export interface TokenOperator extends Operator {
  get tokenNode(): TokenNode;
}

export interface Expression extends AstNode {
  // Root of the expression tree
  get content(): AstNode | undefined;
  // Optional exclamation mark (writeback) at the end of expression.
  // get exclamation(): TokenNode | undefined;
}

export interface Group extends Operator {
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

// Fully parsed intruction with attached information
// that came from the instruction set JSON file.
export interface Instruction {
  readonly fullName: string; // LDMIANE.W
  readonly name: string; // 'LDM' - core name
  readonly description: string | undefined;
  readonly isValid: boolean;
}

export enum StatementType {
  Unknown = 0,
  Empty = 1,
  Directive = 2,
  Instruction = 3,
}

export enum StatementSubType {
  None = 0,
  Definition = 1, // name .equ expression
  Declaration = 2, // name: .word 0
  BeginMacro = 3, // .macro
  EndMacro = 4, // .endm
  BeginCondition = 5, // .if*
  EndCondition = 6, // .endif
}

export interface Statement extends AstNode {
  get type(): StatementType;
  get subType(): StatementSubType;
  get label(): TokenNode | undefined;
  get name(): TokenNode | undefined;
  get operands(): CommaSeparatedList;
}

export interface InstructionStatement extends Statement {
  get instruction(): Instruction | undefined;
}

export interface BeginMacroDirective extends Statement {
  get macroName(): TokenNode | undefined;
}

export interface AstRoot extends AstNode {
  readonly text: TextProvider;
  readonly version: number;
  readonly options: LanguageOptions;
  readonly tokens: TextRangeCollection<Token>; // Includes comments
  readonly errors: readonly ParseError[];
  readonly definitions: readonly TokenNode[];
  readonly declarations: readonly TokenNode[];
  readonly statements: readonly Statement[];
  readonly labels: readonly Token[];
}

export enum ParseErrorType {
  None = 0,
  UnexpectedToken = 1,

  // Assembler expects line to start with label or directive.
  InstructionOrDirectiveExpected = 2,
  // Instruction is not recognized.
  UnknownInstruction = 3,
  // Unknown directive
  UnknownDirective = 4,
  // Instruction references label that is not defined.
  UndefinedLabel = 5,
  // Register is expected at this position.
  RegisterExpected = 6,
  // Variable name, register or other symbol is expected.
  SymbolExpected = 7,
  // Identifier or an expression appears to be missing. For example, two binary
  // operators without anything between them or expression like x + y + '.
  LeftOperandExpected = 8,
  RightOperandExpected = 9,
  // String value is expected
  StringExpected = 10,
  OperatorExpected = 11,
  // Typically missing item like {a,}
  ExpressionExpected = 12,
  CloseBraceExpected = 13,
  // Expected non-empty expression inside {} or [].
  EmptyExpression = 14,
  // Expected macro name after .macro
  MacroNameExpected = 15,
  //DataExpected,
  //NumberExpected,
  UnexpectedOperand = 16,
  UnexpectedEndOfLine = 50,
  UnexpectedEndOfFile = 100,
}

export enum ErrorLocation {
  // Whitespace or token before the provided text range. Relatively rare case.
  BeforeToken,
  // The range specified such as when variable in undefined so its reference is squiggled.
  Token,
  // Whitespace after the provided token or end of file. Typical case when required
  // token is missing such as missing close brace or a required operand.
  AfterToken,
}

export enum ErrorSeverity {
  // Informational message, a suggestion
  Informational,
  // Warnings such as obsolete constructs
  Warning,
  // Syntax error
  Error,
  // Fatal error, such as internal product error.
  Fatal,
}

export interface ParseError extends TextRange {
  readonly errorType: ParseErrorType;
  readonly location: ErrorLocation;
}
