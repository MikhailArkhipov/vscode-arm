// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseContext } from '../parser/parseContext';
import { MissingItemParseError, ParseErrorType } from '../parser/parseError';
import { TokenType } from '../tokens/tokens';
import { AstNode, AstNodeImpl } from './astNode';
import { Expression } from './expression';
import { TokenNode } from './tokenNode';

// An item in a comma-separated sequence, such as {a, b, c}.
// Normally an expression followed by an optional comma.
export class CommaSeparatedItem extends AstNodeImpl {
  private _item: Expression | undefined;
  // Optional trailing comma
  private _comma: TokenNode | undefined;

  public get item(): Expression | undefined {
    return this._item;
  }
  public get comma(): TokenNode | undefined {
    return this._comma;
  }

  public parse(context: ParseContext, parent: AstNode | undefined): boolean {
    switch (context.currentToken.type) {
      case TokenType.Comma:
        // Missing item
        this._comma = TokenNode.create(context, this);
        context.addError(new MissingItemParseError(ParseErrorType.ExpressionExpected, context.currentToken));
        break;

      default:
        this._item = new Expression();
        this._item.parse(context, this);
        if (context.currentToken.type === TokenType.Comma.valueOf()) {
          this._comma = TokenNode.create(context, this);
        }
        break;
    }
    return super.parse(context, parent);
  }
}

export class CommaSeparatedList extends AstNodeImpl {
  // Type of the token to parse up to. For example, } in {a, b, c}
  private _openBrace: TokenNode | undefined;
  private _closeBrace: TokenNode | undefined;
  private readonly _items: CommaSeparatedItem[] = [];

  public get closeBrace(): TokenNode | undefined {
    return this._closeBrace;
  }
  public get openBrace(): TokenNode | undefined {
    return this._openBrace;
  }
  public get items(): readonly CommaSeparatedItem[] {
    return this._items;
  }

  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    // Check if list is surroinded by braces
    const ct = context.currentToken;
    let closeBraceType: TokenType | undefined;

    if(ct.type === TokenType.OpenCurly || ct.type === TokenType.OpenBracket) {
      this._openBrace = TokenNode.create(context, this);
      closeBraceType = ParseContext.getMatchingBraceToken(this._openBrace.token.type);
    }

    while (!context.tokens.isEndOfLine()) {
      if(closeBraceType && context.currentToken.type === closeBraceType) {
        this._closeBrace = TokenNode.create(context, this);
        break;
      }
      const item = new CommaSeparatedItem();
      item.parse(context, this);
      this._items.push(item);
    }
    // Do not include empty list in the tree since it has no positioning information.
    if (!this._openBrace && !this._closeBrace && this._items.length === 0) {
      return false;
    }
    
    // Check for a brace mismatch
    if(this._openBrace && !this._closeBrace) {
      context.addError(new MissingItemParseError(ParseErrorType.CloseBraceExpected, context.tokens.previousToken));
    }

    return super.parse(context, parent);
  }
}
