// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseContext } from '../parser/parseContext';
import { TokenStream } from '../tokens/tokenStream';
import { TokenType } from '../tokens/tokens';
import { AstNode } from './astNode';
import { TokenNode } from './tokenNode';

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

// All operators are single-token kind.
export class Operator extends TokenNode {
  private _type = OperatorType.Unknown;
  private _associativity = Associativity.Left;
  private _unary = false;

  public leftOperand: AstNode | undefined;
  public rightOperand: AstNode | undefined;

  constructor(unary: boolean, type?: OperatorType | undefined) {
    super();
    this._unary = unary;
    this._associativity = unary ? Associativity.Right : Associativity.Left;
  }

  public get type(): OperatorType {
    return this._type;
  }
  public get precedence(): number {
    return Operator.getPrecedence(this.type);
  }
  public get associativity(): Associativity {
    return this._associativity;
  }
  public get unary(): boolean {
    return this._unary;
  }

  public parse(context: ParseContext, parent: AstNode | undefined): boolean {
    if (context.currentToken.type !== TokenType.Operator) {
      throw new Error('Parser: expected operator token.');
    }
    this._type = Operator.getOperatorType(context.getCurrentTokenText());
    // If operator is preceded by an operator, it is then unary
    // Look back two tokens since operator parsing already consumed its token.
    if (this._unary || Operator.isUnaryOperator(context.tokens, this._type, -2)) {
      this._type = Operator.getUnaryForm(this._type);
      this._unary = true;
      this._associativity = Associativity.Right;
    }
    return super.parse(context, parent);
  }
}

export namespace Operator {
  /// Given token stream and operator type determines if operator is unary
  export function isUnary(tokens: TokenStream, operatorType: OperatorType, offset: number): boolean {
    if (!isPossiblyUnary(operatorType)) {
      return false;
    }

    // If operator is preceded by an operator, it is then unary
    const precedingTokenType = tokens.lookAhead(offset).type;
    switch (precedingTokenType) {
      case TokenType.Operator:
      case TokenType.OpenBrace:
      case TokenType.OpenCurly:
      case TokenType.OpenBracket:
        return true;
    }
    return false;
  }

  export function getPrecedence(operatorType: OperatorType): number {
    // Lower number means lower priority. Lowest priority operators
    // appear higher in the tree so they are evaluated last.
    // http://cs.stmarys.ca/~porter/csc/ref/cpp_operators.html
    // https://ftp.gnu.org/old-gnu/Manuals/gas-2.9.1/html_chapter/as_6.html#SEC60

    switch (operatorType) {
      case OperatorType.Sentinel:
        return 0;

      case OperatorType.Add:
      case OperatorType.Subtract:
        return 100;

      case OperatorType.Or:
      case OperatorType.And:
      case OperatorType.Xor:
        return 40;

      case OperatorType.Not:
        return 50;

      case OperatorType.ShiftLeft:
      case OperatorType.ShiftRight:
        return 120;

      case OperatorType.Modulo: // %
        return 130;

      case OperatorType.Multiply:
      case OperatorType.Divide:
        return 140;

      case OperatorType.UnaryMinus: // -
      case OperatorType.UnaryPlus: // +
        return 200;

      case OperatorType.Group: // ( ) around expression
        return 300;
    }
    return 1000;
  }

  export function getOperatorType(text: string): OperatorType {
    switch (text) {
      case '+':
        return OperatorType.Add;
      case '-':
        return OperatorType.Subtract;
      case '*':
        return OperatorType.Multiply;
      case '/':
        return OperatorType.Divide;
      case '^':
        return OperatorType.Xor;
      case '%':
        return OperatorType.Modulo;
      case '>>':
        return OperatorType.ShiftRight;
      case '<<':
        return OperatorType.ShiftLeft;
      case '!':
        return OperatorType.Not; // !
      case '&':
        return OperatorType.And; // &
      case '|':
        return OperatorType.Or; // |
    }
    return OperatorType.Unknown;
  }

  export function getUnaryForm(operatorType: OperatorType): OperatorType {
    switch (operatorType) {
      case OperatorType.Subtract:
        return OperatorType.UnaryMinus;
      case OperatorType.Add:
        return OperatorType.UnaryPlus;
    }
    return operatorType;
  }

  export function isUnaryOperator(tokens: TokenStream, operatorType: OperatorType, offset: number) {
    if (!isPossiblyUnary(operatorType)) {
      return false;
    }
    // If operator is preceded by an operator, it is then unary
    const precedingTokenType = tokens.lookAhead(offset).type;
    switch (precedingTokenType) {
      case TokenType.Operator:
      case TokenType.OpenBrace:
      case TokenType.OpenCurly:
      case TokenType.OpenBracket:
        return true;
    }
    return false;
  }

  function isPossiblyUnary(operatorType: OperatorType): boolean {
    switch (operatorType) {
      case OperatorType.Subtract:
      case OperatorType.Add:
      case OperatorType.Not:
        return true;
    }
    return false;
  }
}
