// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseContext } from '../parser/parseContext';
import { MissingItemError } from '../parser/parseError';
import { TokenType, TokenSubType } from '../tokens/definitions';
import { AstNode, ParseErrorType } from './definitions';
import { SymbolStatementImpl } from './directive';
import { TokenNodeImpl } from './tokenNode';

// .equ name, value, aka #define in C
export class DefinitionDirectiveStatementImpl extends SymbolStatementImpl {
  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    // Directive name (.equ, .set, ...)
    this._name = TokenNodeImpl.create(context, this);
    if (context.currentToken.type === TokenType.Symbol) {
      this._symbolName = TokenNodeImpl.create(context, this);
      this._symbolName.token.subType = TokenSubType.Definition;
    } else {
      context.addError(new MissingItemError(ParseErrorType.SymbolNameExpected, context.tokens.previousToken));
    }
    return super.parse(context, parent);
  }

  public toString(): string {
    return `Definition:(${this._symbolName.tokenText()}) ${this._name?.tokenText()} [${this.start}...${this.end})`;
  }
}

// 'symbol = expression' statement  is the same as '.set symbol, expression'
export class EqualsDefinitionStatementImpl extends SymbolStatementImpl {
  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    // Sequence is 'symbol = expression' so technically there is no 'name'
    // but we will be using '=' as the name item.
    this._symbolName = TokenNodeImpl.create(context, this);
    this._name = TokenNodeImpl.create(context, this);
    return super.parse(context, parent);
  }
  public toString(): string {
    return `Equals:(${this._symbolName.tokenText()}) ${this._name?.tokenText()} [${this.start}...${this.end})`;
  }
}
