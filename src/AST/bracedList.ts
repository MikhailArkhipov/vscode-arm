// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseContext } from "../parser/parseContext";
import { MissingItemParseError, ParseErrorType } from "../parser/parseError";
import { TokenType } from "../tokens/tokens";
import { AstNode } from "./astNode";
import { CommaSeparatedList } from "./commaSeparatedList";
import { TokenNode } from "./tokenNode";

// Set is a sequence in curly braces: {a, b, c}
export class BracedList extends CommaSeparatedList {
  private _openBrace: TokenNode;
  private _closeBrace: TokenNode | undefined;
  private _braceType: TokenType;

  constructor(braceType: TokenType) {
    super(ParseContext.getMatchingBraceToken(braceType));
    this._braceType = braceType;
  }

  public get openBrace(): TokenNode {
    return this._openBrace;
  }
  public get closeBrace(): TokenNode | undefined {
    return this._closeBrace;
  }

  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    const tokens = context.tokens;
    if(tokens.currentToken.tokenType !== this._braceType) {
      throw new Error('Parser: expected a brace.')
    }   
    this._openBrace = TokenNode.create(context, this);
    // Parse list contents
    super.parse(context, parent);
    // Now closing brace
    if (tokens.currentToken.tokenType === ParseContext.getMatchingBraceToken(this._braceType)) {
        this._closeBrace = TokenNode.create(context, this);
    } else {
        context.addError(new MissingItemParseError(ParseErrorType.BraceMismatch, tokens.previousToken));
    }
    return true;
  }
}

