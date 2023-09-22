// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { Directive } from '../instructions/directive';
import { ParseContext } from '../parser/parseContext';
import { ErrorLocation, ParseError, ParseErrorType } from '../parser/parseError';
import { TokenType } from '../tokens/tokens';
import { AstNode, AstNodeImpl } from './astNode';
import { Operand } from './operand';
import { TokenNode } from './tokenNode';

// GCC: https://sourceware.org/binutils/docs-2.26/as/Statements.html#Statements
// A statement begins with zero or more labels, optionally followed by a key symbol
// which determines what kind of statement it is. The key symbol determines the syntax
// of the rest of the statement. If the symbol begins with a dot `.' then the statement
// is an assembler directive. If the symbol begins with a letter the statement is
// an assembly language instruction.

export abstract class Statement extends AstNodeImpl {
  protected readonly _label: TokenNode | undefined;
  protected readonly _operands: TokenNode[] = [];
  private _name: TokenNode | undefined;

  constructor(label: TokenNode | undefined) {
    super();
    this._label = label;
    if (label) {
      label.parent = this;
      this.appendChild(label);
    }
  }

  public get name(): TokenNode | undefined {
    return this._name;
  }

  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    if (context.tokens.currentToken.tokenType !== TokenType.Directive) {
      throw new Error('SymbolDefinitionStatement: Expected directive token.');
    }
    this.parseName(context);
    this.parseOperands(context);
    return super.parse(context, parent);
  }

  protected parseName(context: ParseContext, parent?: AstNode | undefined): boolean {
    this._name = new TokenNode();
    this._name.parse(context, this);
    this.appendChild(this._name);
    return super.parse(context, parent);
  }

  private parseOperands(context: ParseContext): void {
    // Parse directive or instruction operands. Sequence is 'fragment,fragment, ...'.
    // Fragment may include whitespace when it is an expression or an indirect.
    // Consider INSTR x1, [ x2 ], (1 + 2). We let code analysis/validation deal
    // with any errors like missing braces, incorrect number of operands, etc.
    // Parser only fills data structures for the subsequent analysis pass.
    while (!context.tokens.isEndOfStream() && !context.tokens.isEndOfLine()) {
      const ts = context.tokens;
      if (ts.currentToken.tokenType !== TokenType.Comma) {
        const operand = new Operand();
        if (!operand.parse(context, this)) {
          break;
        }
        this.appendChild(operand);
      } else {
        context.addError(new ParseError(ParseErrorType.OperandExpected, ErrorLocation.Token, ts.currentToken));
      }
      context.tokens.moveToNextToken();
    }
  }

  public get label(): AstNode | undefined {
    return this._label;
  }
}

export namespace Statement {
  export function create(context: ParseContext, parent?: AstNode | undefined): Statement | undefined {
    let s: Statement | undefined;
    // {label:} => empty statement
    // {label:} .directive => directive statement
    // {label:} symbol .directive => .equ statement
    // {label:} symbol => instruction statement
    // {label:} ??? => Unknown statement

    // TODO: handle variable declarations (i.e. foo:\n.word 10).
    const label = parseLabel(context);
    if (context.tokens.isEndOfLine() || context.tokens.isEndOfStream()) {
      context.tokens.moveToNextToken();
      if (label) {
        s = new EmptyStatement(label);
        s.parse(context, parent);
        return s;
      }
      return;
    }

    const ct = context.tokens.currentToken;
    switch (ct.tokenType) {
      case TokenType.Directive:
        {
          const directiveName = context.text.getText(ct.start, ct.length);
          if (Directive.isSymbolDefinition(directiveName)) {
            s = new SymbolDefinitionStatement(label);
          } else {
            if (Directive.isDataDeclaration(directiveName)) {
              s = new DataDeclarationStatement(label);
            } else {
              s = new DirectiveStatement(label);
            }
          }
        }
        break;

      case TokenType.Symbol:
        {
          // name .equ value
          const nt = context.tokens.nextToken;
          if (nt.tokenType === TokenType.Directive) {
            const nextTokenText = context.text.getText(nt.start, nt.length);
            if (Directive.isSymbolDefinition(nextTokenText)) {
              s = new SymbolDefinitionStatement(label);
            }
          }
          s = s ?? new InstructionStatement(label);
        }
        break;

      default:
        s = new UnknownStatement(label);
        break;
    }

    s.parse(context, parent);
    return s;
  }

  function parseLabel(context: ParseContext): TokenNode | undefined {
    // Tokenizer already performed basic name checks.
    const ct = context.tokens.currentToken;
    if (ct.tokenType === TokenType.Label) {
      const label = new TokenNode();
      label.parse(context);
      return label;
    }
  }
}

export class DirectiveStatement extends Statement {
  constructor(label: TokenNode | undefined) {
    super(label);
  }
}

export class SymbolDefinitionStatement extends DirectiveStatement {
  protected _symbolName: TokenNode;

  constructor(label: TokenNode | undefined) {
    super(label);
  }
  public get symbolName(): TokenNode {
    return this._symbolName;
  }
}

export class EquDirectiveStatement extends SymbolDefinitionStatement {
  constructor(label: TokenNode | undefined) {
    super(label);
  }
  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    const ct = context.tokens.currentToken;
    const nt = context.tokens.nextToken;
    if (ct.tokenType !== TokenType.Symbol || nt.tokenType !== TokenType.Directive) {
      throw new Error('EquDirectiveStatement: Expected symbol token followed by directive token.');
    }
    // Parse 'name' in 'name .equ value(s)'
    this._symbolName = new TokenNode();
    this._symbolName.parse(context, this);
    this.appendChild(this._symbolName);
    // Proceed with regular directive parse.
    return super.parse(context, parent);
  }
}

export class SetDirectiveStatement extends SymbolDefinitionStatement {
  constructor(label: TokenNode | undefined) {
    super(label);
  }
  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    // .set symbol_name, expressions
    const ct = context.tokens.currentToken;
    const nt = context.tokens.nextToken;
    if (ct.tokenType !== TokenType.Directive || nt.tokenType !== TokenType.Symbol) {
      throw new Error('SetDirectiveStatement: Expected directive token followed by a symbol token.');
    }
    // Fetch name and operands
    super.parse(context, parent);
    // First operand should be the symbol
    if (this._operands.length === 0) {
      throw new Error('SetDirectiveStatement: Expected at least one operand.');
    }
    this._symbolName = this._operands[0];
    return true;
  }
}

export class DataDeclarationStatement extends DirectiveStatement {
  constructor(label: TokenNode | undefined) {
    super(label);
  }
}

export class InstructionStatement extends Statement {
  constructor(label: TokenNode | undefined) {
    super(label);
  }
}

export class EmptyStatement extends Statement {
  constructor(label: TokenNode) {
    super(label);
  }
}

export class UnknownStatement extends Statement {
  constructor(label: TokenNode | undefined) {
    super(label);
  }
}
