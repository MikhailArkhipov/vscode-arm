// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseContext } from '../parser/parseContext';
import { MissingItemParseError, ParseErrorType } from '../parser/parseError';
import { TokenType } from '../tokens/tokens';
import { AstNode, AstNodeImpl } from './astNode';
import { Expression } from './expression';
import { TokenNode } from './tokenNode';

// An item in a comma-separated sequence, such as {a, b, c}.
// Basically, anything that is followed by an optional comma.
export class CommaSeparatedItem extends AstNodeImpl {
  private _item: AstNode | undefined;
  // Optional trailing comma
  private _comma: TokenNode | undefined;

  public get item(): AstNode | undefined {
    return this._item;
  }
  public get comma(): TokenNode | undefined {
    return this._comma;
  }

  public parse(context: ParseContext, parent: AstNode | undefined): boolean {
    switch (context.currentToken.tokenType) {
      case TokenType.Comma:
        // Missing item
        this._comma = TokenNode.create(context, this);
        context.addError(new MissingItemParseError(ParseErrorType.ExpressionExpected, context.currentToken));
        break;

      case TokenType.Symbol:
      case TokenType.Number:
      case TokenType.String:
        this._item = TokenNode.create(context, this);
        // Simple case - item then comma or a list terminating token.
        if (context.currentToken.tokenType === TokenType.Comma.valueOf()) {
          this._comma = TokenNode.create(context, this);
        }
        break;

      default:
        this._item = new Expression();
        this._item.parse(context, this);
        if (context.currentToken.tokenType === TokenType.Comma.valueOf()) {
          this._comma = TokenNode.create(context, this);
        }
        break;
    }
    return super.parse(context, parent);
  }
}

export class CommaSeparatedList extends AstNodeImpl {
  // Type of the token to parse up to. For example, } in {a, b, c}
  private readonly _terminatingTokenType: TokenType;
  private readonly _items: AstNode[] = [];

  constructor(terminatingTokenType: TokenType) {
    super();
    this._terminatingTokenType = terminatingTokenType;
  }

  public get items(): readonly AstNode[] {
    return this._items;
  }

  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    while (!context.tokens.isEndOfLine()) {
      if (context.currentToken.tokenType === this._terminatingTokenType) {
        break;
      }
      context.terminatingTokenType = this._terminatingTokenType;
      const item = new CommaSeparatedItem();
      item.parse(context, this);
    }
    // Do not include empty list in the tree since it has no positioning information.
    if (this._items.length > 0) {
      super.parse(context, parent);
    }
    return true;
  }
}
