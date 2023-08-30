// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ErrorLocation, ParseError, ParseErrorType } from "../parser/parseError";
import { ParseContext } from "../parser/parser";
import { Char } from "../text/charCodes";
import { Token, TokenType } from "../tokens/tokens";
import { AstNode, AstNodeImpl } from "./astNode";
import { Directive } from "./directive";
import { EmptyStatement } from "./emptyStatement";
import { Instruction } from "./instruction";
import { Operand } from "./operand";
import { TokenNode } from "./tokenNode";

// GCC: https://sourceware.org/binutils/docs-2.26/as/Statements.html#Statements
// A statement begins with zero or more labels, optionally followed by a key symbol
// which determines what kind of statement it is. The key symbol determines the syntax
// of the rest of the statement. If the symbol begins with a dot `.' then the statement
// is an assembler directive. If the symbol begins with a letter the statement is
// an assembly language instruction.

export abstract class Statement extends AstNodeImpl {
  protected _label: AstNode | undefined;
  protected _name: AstNode | undefined;

  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    // First consider label.
    this.parseLabel(context);
    this.parseName(context);    
    this.parseOperands(context);
    return super.parse(context, parent);    
  }

  protected abstract checkStatementName(text: string): ParseErrorType | undefined;

  private parseLabel(context: ParseContext): boolean {
    // ARM does not require : after the label name which makes it a guessing game.
    // Like, is standalone FOO a label or an instruction if there are no arguments?
    // Not handling ARM for now, assuming GCC.

    // GCC: https://sourceware.org/binutils/docs-2.26/as/Symbol-Names.html#Symbol-Names
    // Label is a symbol followed by colon.
    var ct = context.tokens.currentToken;
    var text = context.text.getText(ct.start, ct.length);  
    if (context.config.colonInLabels && text.charCodeAt(text.length - 1) !== Char.Colon) {
      return false;
    }

    if (!Token.isSymbol(text, ct.start, ct.length - 1)) {
      context.addError(new ParseError(ParseErrorType.LabelName, ErrorLocation.Token, context.tokens.currentToken));
      context.tokens.moveToNextToken();
      return false;
    }

    this._label = new TokenNode(ct);
    this.appendChild(this._label);

    context.tokens.moveToNextToken();
    return true;
  }

  private parseName(context: ParseContext): boolean {
    var ct = context.tokens.currentToken;
    var text = context.text.getText(ct.start, ct.length);

    var errorType = this.checkStatementName(text);
    if(!errorType) {     
      this._name = new TokenNode(ct);
      this.appendChild(this._name);
    } else {
      context.addError(new ParseError(errorType, ErrorLocation.Token, ct));
    }

    context.tokens.moveToNextToken();
    return errorType !== undefined;
  }
    
  private parseOperands(context: ParseContext): void {
    // Parse directive or instruction operands. Sequence is 'fragment,fragment, ...'.
    // Fragment may include whitespace when it is an expression or an indirect.
    // Consider INSTR x1, [ x2 ], (1 + 2). We let code analysis/validation deal
    // with any errors like missing braces, incorrect number of operands, etc.
    // Parser only fills data structures for the subsequent analysis pass.
    while(!context.tokens.isEndOfStream() && !context.tokens.isEndOfLine()) {
      var ts = context.tokens;
      if(ts.currentToken.tokenType !== TokenType.Comma) {
        var operand = new Operand();
        if(!operand.parse(context, this)) {
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
  public get name(): AstNode | undefined {
    return this._name;
  }
}

export namespace Statement {
  export function create(context: ParseContext, parent: AstNode): Statement | undefined {
    // Is it an empty statement?
    var statement: Statement | undefined;
    if (context.tokens.isEndOfLine()) {
      statement = EmptyStatement.create(context, parent);
      if (!statement) {
        statement = Directive.create(context, parent);
        if (!statement) {
          statement = Instruction.create(context, parent);
        }
      }
    }
    return statement;
  }
}
