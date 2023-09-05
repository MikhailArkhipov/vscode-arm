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
    if (ct.tokenType != TokenType.Label) {
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
      switch (ct.tokenType) {
        case TokenType.Directive:
          this._type = StatementType.Directive;
          break;
        case TokenType.Instruction:
          this._type = StatementType.Instruction;
          break;
        default:
          this._type = StatementType.Unknown;
          context.addError(new ParseError(ParseErrorType.InstructionOrDirectiveExpected, ErrorLocation.Token, ct));
          break;
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

  public get type(): StatementType {
    return this._type;
  }
  public get label(): AstNode | undefined {
    return this._label;
  }
  public get name(): AstNode | undefined {
    return this._name;
  }

  // private isLabel(tokenText: string, start: number, length: number): boolean {
  //   // Label must be the first element in line.
  //   if (!this.isPreviousTokenNewLine()) {
  //     return false;
  //   }
  //   // No previous token (start of the file) or it is a line break,
  //   // so we are at the start of the line.
  //   if (this._config.colonInLabels) {
  //     if (tokenText.charCodeAt(tokenText.length - 1) !== Char.Colon) {
  //       return false;
  //     }
  //   } else {
  //     // ARM UAL requires labels at the beginning of the line.
  //     if (start > 0) {
  //       return false;
  //     }
  //   }
  //   var symbol = tokenText.substring(0, length - (this._config.colonInLabels ? 1 : 0));
  //   // Either symbol OR a number (label in a macro like 1:, 2:).
  //   return Text.isSymbol(symbol) || Text.isDecimalNumber(symbol);
  // }
}
