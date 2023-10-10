// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseContext } from '../parser/parseContext';
import { Token } from '../tokens/definitions';
import { AstNodeImpl } from './astNode';
import { AstNode, TokenNode } from './definitions';

// Node that represents a single token item
export class TokenNodeImpl extends AstNodeImpl implements TokenNode {
  private _token: Token;

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
    if (context.tokens.isEndOfLine()) {
      throw new Error('TokenNode: unexpected line break or end of stream.');
    }
    this._token = context.currentToken;
    context.tokens.moveToNextToken();
    return super.parse(context, parent);
  }

  public toString(): string {
    return `Token:${this._token.type}:${this._token.subType} ${this.tokenText()} [${this.start}...${this.end})`;
  }

  public tokenText(): string {
    const root = AstNode.getRoot(this);
    return root ? root.text.getText(this.start, this.length) : '<no-root>';
  }
}

export namespace TokenNodeImpl {
  export function create(context: ParseContext, parent: AstNode | undefined): TokenNodeImpl {
    const tn = new TokenNodeImpl();
    tn.parse(context, parent);
    return tn;
  }
}
