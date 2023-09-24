// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { Directive } from '../instructions/directive';
import { ParseContext } from '../parser/parseContext';
import { Token, TokenSubType, TokenType } from '../tokens/tokens';
import { AstNode, AstNodeImpl } from './astNode';
import { CommaSeparatedList } from './commaSeparatedList';
import { TokenNode } from './tokenNode';

// GCC: https://sourceware.org/binutils/docs-2.26/as/Statements.html#Statements
// A statement begins with zero or more labels, optionally followed by a key symbol
// which determines what kind of statement it is. The key symbol determines the syntax
// of the rest of the statement. If the symbol begins with a dot `.' then the statement
// is an assembler directive. If the symbol begins with a letter the statement is
// an assembly language instruction.

export enum StatementType {
  Unknown = 0,
  Empty = 1,
  Directive = 2,
  Instruction = 3,
}

export enum StatementSubType {
  None = 0,
  SymbolDefinition = 1, // name .equ expression
  VariableDeclaration = 2, // name: .word 0
}

export class Statement extends AstNodeImpl {
  private _type: StatementType = StatementType.Unknown;
  private _subType: StatementSubType = StatementSubType.None;
  private _label: TokenNode | undefined;
  private _name: TokenNode | undefined;
  private _operands: CommaSeparatedList;

  // If statement declares a variable, this is the token. It may or may not be a child
  // of this node since name of the  variable/data may be provided by a preceding label.
  // Consider 'varName:\n\n\n.asciiz "string"'.
  private _symbolName: TokenNode | undefined;

  public get type(): StatementType {
    return this._type;
  }
  public get subType(): StatementSubType {
    return this._subType;
  }
  public get label(): TokenNode | undefined {
    return this._label;
  }
  public get name(): TokenNode | undefined {
    return this._name;
  }
  public get symbolName(): TokenNode | undefined {
    return this._symbolName;
  }
  public get operands(): CommaSeparatedList {
    return this._operands;
  }

  // {label:}{instruction}{operands}
  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    // Verify statement starts at the beginning of a line.
    if (context.previousToken.type !== TokenType.EndOfLine && context.previousToken.type !== TokenType.EndOfStream) {
      throw new Error('Parser: statement must begin at the start of the line.');
    }

    if (context.currentToken.type === TokenType.Label) {
      this._label = TokenNode.create(context, this);
    }

    this.parseType(context);
    // Operands are a comma-separated list
    this._operands = new CommaSeparatedList();
    this._operands.parse(context, this);

    return super.parse(context, parent);
  }

  private parseType(context: ParseContext): void {
    switch (context.currentToken.type) {
      case TokenType.EndOfLine:
      case TokenType.EndOfStream:
        // {label:} => empty statement
        this._type = StatementType.Empty;
        break;

      case TokenType.Directive:
        {
          this._type = StatementType.Directive;
          // Check if this is a data declaration like 'label: .word 0'
          const variableName = this.isVariableDeclaration(context, context.currentToken);
          if (variableName) {
            this._subType = StatementSubType.VariableDeclaration;
            this._symbolName = variableName;
          } else {
            this._subType = StatementSubType.None;
          }
          this._name = TokenNode.create(context, this);
        }
        break;

      case TokenType.Symbol:
        if (this.isSymbolDefinition(context, context.nextToken)) {
          // {label:} symbol .directive => .equ statement
          // name .equ value, like #define in C
          this._type = StatementType.Directive;
          this._subType = StatementSubType.SymbolDefinition;
          this._symbolName = TokenNode.create(context, this);
          this._name = TokenNode.create(context, this);
          this._symbolName.token.subType = TokenSubType.SymbolDeclaration;
        } else {
          // {label:} symbol => instruction statement
          this._type = StatementType.Instruction;
        }
        break;

      default:
        // {label:} ??? => Unknown statement
        this._type = StatementType.Unknown;
        break;
    }
    if (this._name) {
      this.appendChild(this._name);
    }
  }

  // name .equ value, aka #define in C
  private isSymbolDefinition(context: ParseContext, t: Token): boolean {
    if (t.type === TokenType.Directive) {
      const tokenText = context.text.getText(t.start, t.length);
      return Directive.isSymbolDefinition(tokenText);
    }
    return false;
  }

  // name: .word 0, aka int name = 0 in C
  private isVariableDeclaration(context: ParseContext, t: Token): TokenNode | undefined {
    if (t.type === TokenType.Directive) {
      const tokenText = context.text.getText(t.start, t.length);
      const isDataDirective = Directive.isVariableDeclaration(tokenText);
      if (!isDataDirective) {
        return;
      }
      // Now check if there is label on this or preceding statement.
      // 'label: .word 0' and 'label:\n .word 0'.
      if (this._label) {
        return this._label;
      }
      // Check preceding statement
      const st = context.root.statements;
      const last = st.length > 0 ? st[st.length - 1] : undefined;
      return last?.label;
    }
    return;
  }
}
