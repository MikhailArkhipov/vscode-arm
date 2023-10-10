// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseContext } from '../parser/parseContext';
import { ParseErrorImpl, MissingItemError } from '../parser/parseError';
import { TokenType, TokenSubType } from '../tokens/definitions';
import {
  InstructionStatement,
  StatementType,
  StatementSubType,
  AstNode,
  ParseErrorType,
  ErrorLocation,
  InstructionInfo,
} from './definitions';
import { getInstructionInfo } from './instructionInfo';
import { StatementImpl } from './statement';
import { TokenNodeImpl } from './tokenNode';

// [label:] name [operands]
export class InstructionStatementImpl extends StatementImpl implements InstructionStatement {
  private _instruction: InstructionInfo;

  get type(): StatementType {
    return StatementType.Instruction;
  }
  public get subType(): StatementSubType {
    return StatementSubType.None;
  }
  public get instruction(): InstructionInfo | undefined {
    return this._instruction;
  }

  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    // {label:} symbol => instruction statement
    // Comma after symbol most probably means instruction name is missing
    if (context.nextToken.type === TokenType.Comma) {
      context.addError(new MissingItemError(ParseErrorType.NameExpected, context.currentToken));
    } else {
      this._name = TokenNodeImpl.create(context, this); // instruction name
    }

    this.parseInstructionName(context);
    return super.parse(context, parent);
  }

  public toString(): string {
    return `Instruction ${this._name?.tokenText()} [${this.start}...${this.end})`;
  }

  // Check instruction name against the set and apply subtype
  // to name token as appropriate.
  private parseInstructionName(context: ParseContext): void {
    if (!this._name) {
      return;
    }
    const nameText = context.getTokenText(this._name.token).toUpperCase();
    const instruction = getInstructionInfo(nameText, context.instructionSet);
    if (!instruction.isValid) {
      context.addError(new ParseErrorImpl(ParseErrorType.UnknownInstruction, ErrorLocation.Token, this._name!));
    } else {
      this._name.token.subType = TokenSubType.Instruction;
    }
  }
}
