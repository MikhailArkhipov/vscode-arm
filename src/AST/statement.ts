// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseContext } from '../parser/parseContext';
import {
  AstNode,
  CommaSeparatedList,
  ErrorLocation,
  Instruction,
  InstructionStatement,
  ParseErrorType,
  Statement,
  StatementSubType,
  StatementType,
  TokenNode,
} from './definitions';
import { TokenNodeImpl } from './tokenNode';
import { ParseErrorImpl, UnexpectedItemError } from '../parser/parseError';
import { AstNodeImpl } from './astNode';
import { TokenSubType, TokenType } from '../tokens/definitions';
import { parseInstructionName } from './instruction';
import { CommaSeparatedListImpl } from './expression';
import { TextRange } from '../text/definitions';

// GCC: https://sourceware.org/binutils/docs-2.26/as/Statements.html#Statements
// A statement begins with zero or more labels, optionally followed by a key symbol
// which determines what kind of statement it is. The key symbol determines the syntax
// of the rest of the statement. If the symbol begins with a dot `.' then the statement
// is an assembler directive. If the symbol begins with a letter the statement is
// an assembly language instruction.

export abstract class StatementImpl extends AstNodeImpl implements Statement {
  protected _label: TokenNode | undefined;
  protected _name: TokenNode | undefined;
  // https://sourceware.org/binutils/docs/as/Int.html
  // Directive arguments are comma-separated expressons and so are the instruction arguments.
  protected _operands: CommaSeparatedListImpl;

  constructor(label: TokenNode | undefined) {
    super();
    this._label = label;
  }

  public abstract get type(): StatementType;
  public abstract get subType(): StatementSubType;

  public get label(): TokenNode | undefined {
    return this._label;
  }
  public get name(): TokenNode | undefined {
    return this._name;
  }
  public get operands(): CommaSeparatedList {
    return this._operands;
  }

  // {label:}{instruction}{operands}
  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    // Skip anytning unrecognized
    const eosPosition = context.tokens.position;
    const nt = context.tokens.nextToken;
    context.tokens.moveToEol();
    if (context.tokens.position - eosPosition > 0) {
      const lastToken = context.tokens.getTokenAt(context.tokens.position - 1);
      // There is something between fully parsed statement and EOL.
      context.addError(
        new UnexpectedItemError(ParseErrorType.UnexpectedToken, TextRange.fromBounds(nt.start, lastToken.end))
      );
    }
    return super.parse(context, parent);
  }
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
}

export class UnknownStatementImpl extends StatementImpl {
  get type(): StatementType {
    return StatementType.Unknown;
  }
  public get subType(): StatementSubType {
    return StatementSubType.None;
  }
}

export class InstructionStatementImpl extends StatementImpl implements InstructionStatement {
  private _instruction: Instruction;

  get type(): StatementType {
    return StatementType.Instruction;
  }
  public get subType(): StatementSubType {
    return StatementSubType.None;
  }
  public get instruction(): Instruction | undefined {
    return this._instruction;
  }

  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    // {label:} symbol => instruction statement
    // Comma after symbol most probably means instruction name is missing
    if (context.nextToken.type === TokenType.Comma) {
      context.addError(new UnexpectedItemError(ParseErrorType.InstructionOrDirectiveExpected, context.currentToken));
    } else {
      this._name = TokenNodeImpl.create(context, this); // instruction name
    }

    this.checkInstructionName(context);

    const operands = new CommaSeparatedListImpl();
    const result = operands.parse(context, this);
    if (result) {
      this._operands = operands;
    }
    return super.parse(context, parent);
  }

  private checkInstructionName(context: ParseContext): void {
    if (!this._name) {
      return;
    }
    const nameText = context.getTokenText(this._name.token).toUpperCase();
    const instruction = parseInstructionName(nameText, context.options.instructionSet);
    if (!instruction.isValid) {
      context.addError(new ParseErrorImpl(ParseErrorType.UnknownInstruction, ErrorLocation.Token, this._name!));
    } else {
      this._name.token.subType = TokenSubType.Instruction;
    }
  }
}
