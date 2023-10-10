// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseContext } from '../parser/parseContext';
import { StatementType, StatementSubType, AstNode, SymbolStatement, TokenNode } from './definitions';
import { StatementImpl } from './statement';
import { TokenNodeImpl } from './tokenNode';

// Base to all directive statements
export abstract class DirectiveStatementImpl extends StatementImpl {
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
    return super.parse(context, parent);
  }

  public toString(): string {
    return `Directive ${this._name?.tokenText()} [${this.start}...${this.end})`;
  }
}

// Base for symbol definitions (i.e. .set, .equ and such), similar to #define.
export abstract class SymbolStatementImpl extends DirectiveStatementImpl implements SymbolStatement {
  protected _symbolName: TokenNode;

  public get subType(): StatementSubType {
    return StatementSubType.Definition;
  }
  public get symbolName(): TokenNode {
    return this._symbolName;
  }
}
