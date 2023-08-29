// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ErrorLocation, ParseError, ParseErrorType } from "../parser/parseError";
import { ParseContext } from "../parser/parser";
import { Char } from "../text/charCodes";
import { Token } from "../tokens/tokens";
import { AstNode, AstNodeImpl } from "./astNode";
import { Directive } from "./directive";
import { Instruction } from "./instruction";

// GCC: https://sourceware.org/binutils/docs-2.26/as/Statements.html#Statements
// A statement begins with zero or more labels, optionally followed by a key symbol
// which determines what kind of statement it is. The key symbol determines the syntax
// of the rest of the statement. If the symbol begins with a dot `.' then the statement
// is an assembler directive. If the symbol begins with a letter the statement is
// an assembly language instruction.

export abstract class Statement extends AstNodeImpl {
  protected _label: Token | undefined;
  protected _name: Token | undefined;

  protected parseLabel(context: ParseContext): boolean {
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

    this._label = ct;
    context.tokens.moveToNextToken();
    return true;
  }

  public get label(): Token | undefined {
    return this._label;
  }
  public get name(): Token | undefined {
    return this._name;
  }
}

export namespace Statement {
  export function create(context: ParseContext, parent: AstNode): Statement | undefined {
    var statement = Directive.create(context);
    if (!statement) {
      statement = Instruction.create(context);
    }
    return statement;
  }
}

// Per https://sourceware.org/binutils/docs/as/Statements.html
// statement end at the end of the line and 'label:' is
// 'label: <empty statement> rather than line continuation.
export class EmptyStatement extends Statement {}
