// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseContext } from "../parser/parseContext";
import { MissingItemParseError, ParseErrorType } from "../parser/parseError";
import { TokenType } from "../tokens/tokens";
import { AstNode } from "./astNode";
import { Expression } from "./expression";
import { Operator, OperatorType, Associativity } from "./operator";
import { TokenNode } from "./tokenNode";

// Braces (grouping) operator. Applies to an expression as in (a+b). 
// Operator is effectively a no-op and returns value of the expression 
// inside braces. It just makes parsing expressions like (b) easier.
export class Group extends Operator {
  private _openBrace: TokenNode;
  private _content: Expression | undefined;
  private _closeBrace: TokenNode | undefined;

  constructor() {
    super(false, OperatorType.Group);
  }

  public get associativity(): Associativity {
    return Associativity.Right; 
  }
  public get openBrace(): TokenNode {
    return this._openBrace;
  }
  public get content(): Expression | undefined {
    return this._content;
  }
  public get closeBrace(): TokenNode | undefined {
    return this._closeBrace;
  }

  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    const tokens = context.tokens;
    if(tokens.currentToken.type !== TokenType.OpenBrace) {
      throw new Error('Parser: expected open brace.')
    }
    this._openBrace = TokenNode.create(context, this);
    this._content = new Expression();
    this._content.parse(context, this);
    
    if (tokens.currentToken.type === TokenType.CloseBrace.valueOf()) {
        this._closeBrace = TokenNode.create(context, this);
    } else {
        context.addError(new MissingItemParseError(ParseErrorType.CloseBraceExpected, tokens.previousToken));
    }
    return super.parse(context, parent);
  }
}