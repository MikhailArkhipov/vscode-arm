// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ErrorLocation, ParseError, ParseErrorType } from "../parser/parseError";
import { ParseContext } from "../parser/parser";
import { Char } from "../text/charCodes";
import { Token } from "../tokens/tokens";
import { AstNode } from "./astNode";
import { Statement } from "./statement";

// '.ascii "string"' and similar
export class Directive extends Statement {
  public parse(context: ParseContext, parent?: AstNode): boolean {
    // First consider label.
    this.parseLabel(context);
    // Try instruction name or directive
    var ct = context.tokens.currentToken;
    var text = context.text.getText(ct.start, ct.length);

    if (!Token.isDirectiveName(text)) {
      context.addError(new ParseError(ParseErrorType.DirectiveName, ErrorLocation.Token, context.tokens.currentToken));
      context.tokens.moveToNextToken();
      return false;
    }

    this._name = ct;
    context.tokens.moveToNextToken();
    // TODO: parse values
    return super.parse(context, parent);
  }
}

export namespace Directive {
  export function create(context: ParseContext): Directive | undefined {
    var ch = context.text.charCodeAt(context.tokens.currentToken.start);
    if (ch === Char.Period) {
      var directive = new Directive();
      if (directive.parse(context, this)) {
        return directive;
      }
    }
  }
}
