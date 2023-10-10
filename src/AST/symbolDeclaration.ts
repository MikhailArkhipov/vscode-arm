// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.
// name: .word 0, aka int name = 0 in C

import { ParseContext } from '../parser/parseContext';
import { TokenSubType } from '../tokens/definitions';
import { StatementSubType, AstNode, Statement, StatementType } from './definitions';
import { SymbolStatementImpl } from './directive';
import { TokenNodeImpl } from './tokenNode';

export class DeclarationDirectiveStatementImpl extends SymbolStatementImpl {
  public get subType(): StatementSubType {
    return StatementSubType.Declaration;
  }

  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    this._name = TokenNodeImpl.create(context, this);
    // TODO: the label ends with : while reference to it does not.
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
      this._symbolName = symbolName;
    }
    return super.parse(context, parent);
  }

  public toString(): string {
    return `Declaration:(${this._symbolName?.tokenText()}) ${this._name?.tokenText()} [${this.start}...${this.end})`;
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
