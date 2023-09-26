// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { Directive } from '../instructions/directive';
import { ParseContext } from '../parser/parseContext';
import { ErrorLocation, ParseError, ParseErrorType } from '../parser/parseError';
import { Token, TokenSubType, TokenType } from '../tokens/tokens';
import { AstNode, CommaSeparatedList, StatementSubType, StatementType, TokenNode } from './definitions';
import { AstNodeImpl } from './astNodeImpl';
import { TokenNodeImpl } from './tokenNode';
import { CommaSeparatedListImpl } from './commaSeparatedList';

// GCC: https://sourceware.org/binutils/docs-2.26/as/Statements.html#Statements
// A statement begins with zero or more labels, optionally followed by a key symbol
// which determines what kind of statement it is. The key symbol determines the syntax
// of the rest of the statement. If the symbol begins with a dot `.' then the statement
// is an assembler directive. If the symbol begins with a letter the statement is
// an assembly language instruction.

export class Statement extends AstNodeImpl implements Statement {
  private _type: StatementType = StatementType.Unknown;
  private _subType: StatementSubType = StatementSubType.None;
  private _label: TokenNode | undefined;
  private _name: TokenNode | undefined;
  // https://sourceware.org/binutils/docs/as/Int.html
  // Directive arguments are comma-separated expressons and so are the instruction arguments.
  private _operands: CommaSeparatedListImpl;

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
      this._label = TokenNodeImpl.create(context, this);
    }

    this.parseType(context);
    // Operands are a comma-separated list
    this._operands = new CommaSeparatedListImpl();
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
        this.handleDirective(context);
        break;

      case TokenType.Symbol:
        if (this.isSymbolDefinition(context, context.nextToken)) {
          // {label:} symbol .directive => .equ statement
          // name .equ value, like #define in C
          this.handleSymbolDefinitionDirective(context);
        } else {
          // {label:} symbol => instruction statement
          // Comma after symbol most probably means instruction name is missing
          this.handleInstruction(context);
        }
        break;

      default:
        // {label:} ??? => Unknown statement
        this._type = StatementType.Unknown;
        context.addError(
          new ParseError(ParseErrorType.InstructionOrDirectiveExpected, ErrorLocation.Token, context.currentToken)
        );
        break;
    }
  }

  private handleDirective(context: ParseContext): void {
    this._type = StatementType.Directive;
    // Check if this is a data declaration like 'label: .word 0'
    const variableName = this.isVariableDeclaration(context, context.currentToken);
    if (variableName) {
      this._subType = StatementSubType.VariableDeclaration;
      this._symbolName = variableName;
    } else {
      this._subType = StatementSubType.None;
    }
    this._name = TokenNodeImpl.create(context, this);
  }

  private handleSymbolDefinitionDirective(context: ParseContext): void {
    // {label:} symbol .directive => .equ statement
    // name .equ value, like #define in C
    this._type = StatementType.Directive;
    this._subType = StatementSubType.SymbolDefinition;
    this._symbolName = TokenNodeImpl.create(context, this); // label name
    this._name = TokenNodeImpl.create(context, this); // directive name
    this._symbolName.token.subType = TokenSubType.SymbolDeclaration;
  }

  private handleInstruction(context: ParseContext): void {
    // {label:} symbol => instruction statement
    // Comma after symbol most probably means instruction name is missing
    if (context.nextToken.type === TokenType.Comma) {
      context.addError(
        new ParseError(ParseErrorType.InstructionOrDirectiveExpected, ErrorLocation.Token, context.currentToken)
      );
    } else {
      this._type = StatementType.Instruction;
      this._name = TokenNodeImpl.create(context, this); // directive name
      this._name.token.subType = TokenSubType.Instruction;
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

  // General syntax check after parsing complete.
  private syntaxCheck(): void {

  }

  private instructionSyntaxCheck(): void {
    // Instruction argument list is 
  }

}
