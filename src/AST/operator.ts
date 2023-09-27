// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseContext } from '../parser/parseContext';
import { TokenStream } from '../tokens/tokenStream';
import { TokenType } from '../tokens/tokens';
import { AstNodeImpl } from './astNode';
import { Associativity, AstNode, Operator, OperatorType, TokenNode, TokenOperator } from './definitions';
import { TokenNodeImpl } from './tokenNode';

// All operators are single-token kind.
export abstract class OperatorImpl extends AstNodeImpl implements Operator {
  protected _type = OperatorType.Unknown;
  protected _associativity = Associativity.Left;
  protected _unary = false;

  private _leftOperand: AstNode | undefined;
  private _rightOperand: AstNode | undefined;

  constructor(unary: boolean, type?: OperatorType | undefined) {
    super();
    this._unary = unary;
    this._associativity = unary ? Associativity.Right : Associativity.Left;
    this._type = type ?? OperatorType.Unknown;
  }

  // Operator
  public get type(): OperatorType {
    return this._type;
  }
  public get precedence(): number {
    return getOperatorPrecedence(this._type);
  }
  public get associativity(): Associativity {
    return this._associativity;
  }
  public get unary(): boolean {
    return this._unary;
  }

  public get leftOperand(): AstNode | undefined {
    return this._leftOperand;
  }
  public set leftOperand(value: AstNode) {
    this._leftOperand = value;
  }

  public get rightOperand(): AstNode | undefined {
    return this._rightOperand;
  }
  public set rightOperand(value: AstNode) {
    this._rightOperand = value;
  }
}

export class TokenOperatorImpl extends OperatorImpl implements TokenOperator {
  private _tokenNode: TokenNode;

  constructor(firstInExpression: boolean, operatorType?: OperatorType) {
    super(firstInExpression, operatorType);
  }
  public get tokenNode(): TokenNode {
    return this._tokenNode;
  }

  public parse(context: ParseContext, parent?: AstNode): boolean {
    if (context.currentToken.type !== TokenType.Operator) {
      throw new Error('Parser: expected operator token.');
    }
    this._type = getOperatorType(context.getCurrentTokenText());
    this._tokenNode = TokenNodeImpl.create(context, this);
    
    // If operator is preceded by an operator, it is then unary
    // Look back two tokens since operator parsing already consumed its token.
    if (this._unary || isUnaryOperator(context.tokens, this._type, -2)) {
      this._type = getUnaryForm(this._type);
      this._unary = true;
      this._associativity = Associativity.Right;
    }
    return super.parse(context, parent);
  }
}

export function getOperatorPrecedence(operatorType: OperatorType): number {
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

function getOperatorType(text: string): OperatorType {
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

function isUnaryOperator(tokens: TokenStream, type: OperatorType, offset: number) {
  if (!isPossiblyUnary(type)) {
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

function isPossiblyUnary(type: OperatorType): boolean {
  switch (type) {
    case OperatorType.Subtract:
    case OperatorType.Add:
    case OperatorType.Not:
      return true;
  }
  return false;
}

function getUnaryForm(type: OperatorType): OperatorType {
  switch (type) {
    case OperatorType.Subtract:
      return OperatorType.UnaryMinus;
    case OperatorType.Add:
      return OperatorType.UnaryPlus;
  }
  return type;
}