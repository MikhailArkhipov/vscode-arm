// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseContext } from '../parser/parseContext';
import { MissingItemError } from '../parser/parseError';
import { TokenType, TokenSubType } from '../tokens/definitions';
import { BeginMacroDirective, TokenNode, StatementSubType, AstNode, ParseErrorType } from './definitions';
import { DirectiveStatementImpl } from './directive';
import { TokenNodeImpl } from './tokenNode';

// TODO: consider turning macro into a block (container node), like a function
// in high level language and group statements inside it. This will come handy
// if we ever want to check local label declarations agains their use, check
// if '\foo' is actually declared as the macro parameter, etc.
export class MacroDirectiveStatementImpl extends DirectiveStatementImpl implements BeginMacroDirective {
  private _macroName: TokenNode;

  public get subType(): StatementSubType {
    return StatementSubType.BeginMacro;
  }
  public get macroName(): TokenNode {
    return this._macroName;
  }

  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    // Not making actual block item just yet
    this._name = TokenNodeImpl.create(context, this);
    if (context.currentToken.type === TokenType.Symbol) {
      this._macroName = TokenNodeImpl.create(context, this);
      this._macroName.token.subType = TokenSubType.MacroName;
    } else {
      context.addError(new MissingItemError(ParseErrorType.MacroNameExpected, context.previousToken));
    }
    return super.parse(context, parent);
  }

  public toString(): string {
    return `Macro:${this.subType} ${this._macroName.tokenText()} [${this.start}...${this.end})`;
  }
}
