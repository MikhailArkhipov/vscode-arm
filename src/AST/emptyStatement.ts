// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseErrorType } from "../parser/parseError";
import { ParseContext } from "../parser/parser";
import { AstNode } from "./astNode";
import { Statement } from "./statement";

// Per https://sourceware.org/binutils/docs/as/Statements.html
// statement end at the end of the line and 'label:' is
// 'label: <empty statement> rather than line continuation.
export class EmptyStatement extends Statement {
  protected checkStatementName(text: string): ParseErrorType | undefined {
    return;
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
