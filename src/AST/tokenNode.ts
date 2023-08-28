// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { Token } from "../tokens/tokens";
import { AstNode, AstNodeImpl } from "./astNode";
import { ParseContext } from "../parser/parser";

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

  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    this._token = context.tokens.currentToken;
    context.tokens.moveToNextToken();
    return super.parse(context, parent);
  }

  public toString(): string {
    var name = this.root ? this.root.text.getText(this._token.start, this._token.length) : "<???>";
    return `${name} [${this.start}...${this.end})`;
  }
}
