// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseContext } from "../parser/parser";
import { AstNode } from "./astNode";
import { Statement } from "./statement";
import { TokenNode } from "./tokenNode";

// '.ascii "string"' and similar
export class Directive extends Statement {
  constructor() {
    super();
  }

  public parse(context: ParseContext, parent?: AstNode): boolean {
    var t = context.tokens;
    
    this.appendChild(new TokenNode(t.currentToken)); // .
    t.moveToNextToken();
    this.appendChild(new TokenNode(t.currentToken)); // name
    t.moveToNextToken();

    super.parse(context, parent);
    return true;
  }
}
