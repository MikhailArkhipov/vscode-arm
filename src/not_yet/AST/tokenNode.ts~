// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseContext } from "../parser/parseContext";
import { Token } from "../tokens/tokens";
import { AstNode, AstNodeImpl } from "./astNode";

// Node that represents a single token item
export class TokenNode extends AstNodeImpl {
  private _token: Token;

  constructor(token: Token) {
    super();
    this._token = token;
  }

  public get token(): Token {
    return this._token;
  }

  public get start(): number {
    return this._token.start;
  }

  public get length(): number {
    return this._token.length;
  }

  public get end(): number {
    return this._token.end;
  }

  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    this._token = context.tokens.currentToken;
    context.tokens.moveToNextToken();
    return super.parse(context, parent);
  }
}
