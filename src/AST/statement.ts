// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseContext } from '../parser/parseContext';
import { AstNode, Statement, StatementSubType, StatementType, TokenNode } from './definitions';
import { TokenNodeImpl } from './tokenNode';
import { AstNodeImpl } from './astNode';

// GCC: https://sourceware.org/binutils/docs-2.26/as/Statements.html#Statements
// A statement begins with zero or more labels, optionally followed by a key symbol
// which determines what kind of statement it is. The key symbol determines the syntax
// of the rest of the statement. If the symbol begins with a dot `.' then the statement
// is an assembler directive. If the symbol begins with a letter the statement is
// an assembly language instruction.

export abstract class StatementImpl extends AstNodeImpl implements Statement {
  protected _label: TokenNode | undefined;
  protected _name: TokenNode | undefined;
  private _operandsOffset = 0;

  public abstract get type(): StatementType;
  public abstract get subType(): StatementSubType;

  constructor(label: TokenNode | undefined) {
    super();
    if(label) {
      label.parent = this;
    }
    this._label = label;
  }

  public get label(): TokenNode | undefined {
    return this._label;
  }
  public get name(): TokenNode | undefined {
    return this._name;
  }
  public get operands(): readonly TokenNode[] {
    // Skip label and name
    let offset = this._label ? 1 : 0;
    offset = this._name ? offset + 1 : offset;
    return this.children
      .asArray()
      .slice(this._operandsOffset)
      .map((t) => t as TokenNode)
      .filter((e) => e);
  }

  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    // After label and name collect all tokens up to EOL.
    // We are not parsing argument lists and expressions just yet.
    this._operandsOffset = this.children.count;
    while (!context.tokens.isEndOfLine()) {
      TokenNodeImpl.create(context, this);
    }
    return super.parse(context, parent);
  }

  abstract toString(): string;
}

export class EmptyStatementImpl extends StatementImpl {
  constructor(label: TokenNode | undefined) {
    super(label);
  }
  get type(): StatementType {
    return StatementType.Empty;
  }
  public get subType(): StatementSubType {
    return StatementSubType.None;
  }

  public toString(): string {
    return 'EmptyStatement';
  }
}

export class UnknownStatementImpl extends StatementImpl {
  get type(): StatementType {
    return StatementType.Unknown;
  }
  public get subType(): StatementSubType {
    return StatementSubType.None;
  }
  public toString(): string {
    return `UnknownStatement [${this.start}...${this.end})`;
  }
}
