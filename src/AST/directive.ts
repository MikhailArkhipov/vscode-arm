// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseContext } from '../parser/parseContext';
import { MissingItemError, ParseErrorImpl } from '../parser/parseError';
import { TokenSubType, TokenType } from '../tokens/definitions';
import {
  StatementType,
  StatementSubType,
  AstNode,
  ParseErrorType,
  TokenNode,
  ErrorLocation,
  Statement,
} from './definitions';
import { CommaSeparatedListImpl } from './expression';
import { StatementImpl } from './statement';
import { TokenNodeImpl } from './tokenNode';

// Base to all directive statements
abstract class DirectiveStatementImpl extends StatementImpl {
  get type(): StatementType {
    return StatementType.Directive;
  }
  public get subType(): StatementSubType {
    return StatementSubType.None;
  }
}

// General directive
export class GeneralDirectiveStatementImpl extends DirectiveStatementImpl {
  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    this._name = TokenNodeImpl.create(context, this);
    this._operands = new CommaSeparatedListImpl();
    this._operands.parse(context, this);
    return super.parse(context, parent);
  }
}

// .equ name, value, aka #define in C
export class DefinitionStatementImpl extends DirectiveStatementImpl {
  public get subType(): StatementSubType {
    return StatementSubType.Definition;
  }
  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    // Directive name (.equ, .set, ...)
    this._name = TokenNodeImpl.create(context, this);
    if (context.tokens.currentToken.type !== TokenType.Symbol) {
      context.addError(new MissingItemError(ParseErrorType.SymbolExpected, context.tokens.previousToken));
    }

    this._operands = new CommaSeparatedListImpl();
    this._operands.parse(context, this);

    if (this._operands.items.count > 0) {
      const firstOperandExp = this._operands.items.getItemAt(0).expression?.content;
      if (firstOperandExp && firstOperandExp.children.count === 1) {
        const symbolName = firstOperandExp as TokenNode;
        if (symbolName.token) {
          symbolName.token.subType = TokenSubType.Definition;
        } else {
          context.addError(new ParseErrorImpl(ParseErrorType.SymbolExpected, ErrorLocation.Token, symbolName));
        }
      }
    }
    return super.parse(context, parent);
  }
}

// name: .word 0, aka int name = 0 in C
export class DeclarationStatementImpl extends DirectiveStatementImpl {
  public get subType(): StatementSubType {
    return StatementSubType.Declaration;
  }

  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    this._name = TokenNodeImpl.create(context, this);
    let symbolName = this._label;
    // Now check if there is label on this or preceding statement.
    // 'label: .word 0' and 'label:\n .word 0'.
    if (!symbolName) {
      // Check preceding statement
      const preceding = this.getLastEmptyWithLabel(context);
      if (preceding) {
        symbolName = preceding.label;
      }
    }
    if (symbolName) {
      symbolName.token.subType = TokenSubType.Declaration;
    }
    return super.parse(context, parent);
  }

  private getLastEmptyWithLabel(context: ParseContext): Statement | undefined {
    const st = context.root.statements;
    for (let i = st.length - 1; i >= 0; i--) {
      const s = st[i];
      if (s.type !== StatementType.Empty) {
        break;
      }
      if (s.label) {
        return s;
      }
    }
  }
}
