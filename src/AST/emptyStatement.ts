// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseContext } from "../parser/parser";
import { AstNode } from "./astNode";
import { Statement } from "./statement";

// Per https://sourceware.org/binutils/docs/as/Statements.html
// statement end at the end of the line and 'label:' is
// 'label: <empty statement> rather than line continuation.
export class EmptyStatement extends Statement {
  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    if (context.tokens.isEndOfLine()) {
      this.parseLabel(context);
      context.tokens.moveToNextToken();
      return super.parse(context, parent);
    }
    return false;
  }
}

export namespace EmptyStatement {
  export function create(context: ParseContext, parent: AstNode): Statement | undefined {
    if (context.tokens.isEndOfLine()) {
      var statement = new EmptyStatement();
      statement.parse(context, parent);
      return statement;
    }
  }
}
