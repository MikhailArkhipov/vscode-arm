// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseContext } from '../parser/parseContext';
import { MissingItemError, ParseErrorImpl } from '../parser/parseError';
import { TokenType } from '../tokens/tokens';
import { AstNode, CommaSeparatedItem, CommaSeparatedList, ErrorLocation, Expression, ParseErrorType, TokenNode } from './definitions';
import { TokenNodeImpl } from './tokenNode';
import { ExpressionImpl } from './expression';
import { AstNodeImpl } from './astNode';
import { TextRangeCollectionImpl } from '../text/textRangeCollection';
import { TextRangeCollection } from '../text/definitions';

// An item in a comma-separated sequence, such as {a, b, c}.
// Normally an expression followed by an optional comma.
export class CommaSeparatedItemImpl extends AstNodeImpl implements CommaSeparatedItem {
  private _item: Expression | undefined;
  // Optional trailing comma
  private _comma: TokenNode | undefined;
  private _nestedListAllowed = true;

  constructor(nestedListAllowed?: boolean) {
    super();
    this._nestedListAllowed = nestedListAllowed ?? true;
  }

  public get expression(): Expression | undefined {
    return this._item;
  }
  public get comma(): TokenNode | undefined {
    return this._comma;
  }

  public parse(context: ParseContext, parent: AstNode | undefined): boolean {
    let result = true;
    switch (context.currentToken.type) {
      case TokenType.Comma:
        // Missing item
        this._comma = TokenNodeImpl.create(context, this);
        context.addError(new MissingItemError(ParseErrorType.ExpressionExpected, context.currentToken));
        // continue parsing since we may be able to recover in 'a,,b'
        break;

      default:
        {
          const expression = new ExpressionImpl(this._nestedListAllowed);
          result = expression.parse(context, this);
          this._item = expression;
          if (context.currentToken.type === TokenType.Comma.valueOf()) {
            this._comma = TokenNodeImpl.create(context, this);            
            result = true; // We may be able to recover 
          }
        }
        break;
    }
    super.parse(context, parent);
    return result;
  }
}

export class CommaSeparatedListImpl extends AstNodeImpl implements CommaSeparatedList {
  // Type of the token to parse up to. For example, } in {a, b, c}
  private _openBrace: TokenNode | undefined;
  private _closeBrace: TokenNode | undefined;
  private readonly _items: CommaSeparatedItem[] = [];

  // CommaSeparatedList
  public get closeBrace(): TokenNode | undefined {
    return this._closeBrace;
  }
  public get openBrace(): TokenNode | undefined {
    return this._openBrace;
  }
  public get items(): TextRangeCollection<CommaSeparatedItem> {
    return new TextRangeCollectionImpl(this._items);
  }

  // ParseItem
  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    // Check if list is surroinded by braces
    const ct = context.currentToken;
    let closeBraceType: TokenType | undefined;

    if (ct.type === TokenType.OpenCurly || ct.type === TokenType.OpenBracket) {
      this._openBrace = TokenNodeImpl.create(context, this);
      closeBraceType = ParseContext.getMatchingBraceToken(this._openBrace.token.type);
    }

    let itemParsed = true;
    while (!context.tokens.isEndOfLine() && itemParsed) {
      if (closeBraceType && context.currentToken.type === closeBraceType) {
        this._closeBrace = TokenNodeImpl.create(context, this);
        break;
      }
      const item = new CommaSeparatedItemImpl(this.openBrace === undefined);
      itemParsed = item.parse(context, this);
      if(itemParsed) {
        this._items.push(item);
      }
    }
    // Do not include empty list in the tree since it has no positioning information.
    if (!this._openBrace && !this._closeBrace && this._items.length === 0) {
      return false;
    }

    // Check for a brace mismatch
    if (this._openBrace) {
      if(!this._closeBrace && itemParsed) {
        // Inner expression was successfully parsed, but there is no closing brace.
        context.addError(new MissingItemError(ParseErrorType.CloseBraceExpected, context.tokens.previousToken));
        // Recoverable
      }
      if(this._closeBrace && this._items.length === 0) {
        context.addError(new ParseErrorImpl(ParseErrorType.EmptyExpression, ErrorLocation.Token, context.tokens.previousToken));
        // Recoverable, don't stop expression parsing.
      }
    }
    super.parse(context, parent);
    return itemParsed;
  }
}
