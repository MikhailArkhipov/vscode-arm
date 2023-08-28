// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseContext } from "../parser/parser";
import { TokenType } from "../tokens/tokens";
import { AstNode, AstNodeImpl } from "./astNode";
import { Directive } from "./directive";

export class Statement extends AstNodeImpl {
  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    return super.parse(context, parent);
  }
}

export namespace Statement {
  export function create(context: ParseContext, parent: AstNode): Statement | undefined {
    var ct = context.tokens.currentToken;
    var nt = context.tokens.nextToken;
    // Is it a directive?
    if (ct.tokenType === TokenType.Period && nt.tokenType === TokenType.Identifier && ct.end === nt.start) {
      var directive = new Directive();
      directive.parse(context, this);
      return directive;
    }
  }
}

// Per https://sourceware.org/binutils/docs/as/Statements.html
// statement end at the end of the line and 'label:' is
// 'label: <empty statement> rather than line continuation.
export class EmptyStatement extends Statement {}
