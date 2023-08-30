// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseErrorType } from "../parser/parseError";
import { ParseContext } from "../parser/parser";
import { Char } from "../text/charCodes";
import { Token } from "../tokens/tokens";
import { AstNode } from "./astNode";
import { Statement } from "./statement";

// '.ascii "string"' and similar
export class Directive extends Statement {
  protected checkStatementName(text: string): ParseErrorType | undefined {
    if (!Token.isDirectiveName(text)) {
      return ParseErrorType.DirectiveName;
    }
  }
}

export namespace Directive {
  export function create(context: ParseContext, parent: AstNode): Directive | undefined {
    var ch = context.text.charCodeAt(context.tokens.currentToken.start);
    if (ch === Char.Period) {
      var directive = new Directive();
      if (directive.parse(context, parent)) {
        return directive;
      }
    }
  }
}
