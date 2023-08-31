// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseContext } from "../parser/parseContext";
import { ErrorLocation, ParseError, ParseErrorType } from "../parser/parseError";
import { Char } from "../text/charCodes";
import { Token, TokenType } from "../tokens/tokens";
import { AstNode, AstNodeImpl } from "./astNode";
import { Operand } from "./operand";
import { TokenNode } from "./tokenNode";

// GCC: https://sourceware.org/binutils/docs-2.26/as/Statements.html#Statements
// A statement begins with zero or more labels, optionally followed by a key symbol
// which determines what kind of statement it is. The key symbol determines the syntax
// of the rest of the statement. If the symbol begins with a dot `.' then the statement
// is an assembler directive. If the symbol begins with a letter the statement is
// an assembly language instruction.

export const enum StatementType {
  Unknown,
  Empty,
  Directive,
  Instruction,
}

export class Statement extends AstNodeImpl {
  private _type: StatementType;
  private _label: AstNode | undefined;
  private _name: AstNode | undefined;

  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    // First consider label.
    this.parseLabel(context);
    this.parseName(context);
    this.parseOperands(context);
    return super.parse(context, parent);
  }

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

    if (!context.tokens.isEndOfLine()) {
      var text = context.text.getText(ct.start, ct.length);
      if (this.isDirectiveName(text)) {
        this._type = StatementType.Directive;
      } else if (this.isInstructionName(text)) {
        this._type = StatementType.Instruction;
      } else {
        this._type = StatementType.Unknown;
        context.addError(new ParseError(ParseErrorType.InstructionOrDirectiveExpected, ErrorLocation.Token, ct));
      }
      var n = new TokenNode(ct);
      if (this._type !== StatementType.Unknown) {
        this._name = n;
      }
      this.appendChild(n);
    } else {
      // Per https://sourceware.org/binutils/docs/as/Statements.html
      // statement end at the end of the line and 'label:' is
      // 'label: <empty statement> rather than line continuation.
      this._type = StatementType.Empty;
    }
    context.tokens.moveToNextToken();
    return true;
  }

  private parseOperands(context: ParseContext): void {
    // Parse directive or instruction operands. Sequence is 'fragment,fragment, ...'.
    // Fragment may include whitespace when it is an expression or an indirect.
    // Consider INSTR x1, [ x2 ], (1 + 2). We let code analysis/validation deal
    // with any errors like missing braces, incorrect number of operands, etc.
    // Parser only fills data structures for the subsequent analysis pass.
    while (!context.tokens.isEndOfStream() && !context.tokens.isEndOfLine()) {
      var ts = context.tokens;
      if (ts.currentToken.tokenType !== TokenType.Comma) {
        var operand = new Operand();
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

  private isDirectiveName(text: string): boolean {
    // Directive name starts with a period. Directive name is a symbol.
    // '.ascii "string"' and similar
    if (text.charCodeAt(0) !== Char.Period) {
      return false;
    }
    return Token.isSymbol(text, 1, text.length - 1);
  }

  // Instruction is a symbol but may contain a single period followed by a modifier.
  // Modifier is letter(s) followed optionally by number(s).
  // Example: BCS.W or LDR.I8
  private isInstructionName(text: string): boolean {
    // INSTR6.I8 - either all upper or all lower case
    var matches = text.match(/[A-Z]+[0-9]*[\.]?[A-Z]*[0-9]?/g);
    if (matches != null && matches.length === 1 && matches[0] === text) {
      return true;
    }
    matches = text.match(/[a-z]+[0-9]*[\.]?[a-z]*[0-9]?/g);
    return matches != null && matches.length === 1 && matches[0] === text;
  }

  public get type(): StatementType {
    return this._type;
  }
  public get label(): AstNode | undefined {
    return this._label;
  }
  public get name(): AstNode | undefined {
    return this._name;
  }
}
