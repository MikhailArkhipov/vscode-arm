// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseContext } from "../parser/parseContext";
import { ErrorLocation, ParseError, ParseErrorType } from "../parser/parseError";
import { TextRangeCollection } from "../text/textRangeCollection";
import { Token, TokenType } from "../tokens/tokens";
import { AstNodeImpl, AstNode } from "./astNode";
import { TokenNode } from "./tokenNode";

export class Operand extends AstNodeImpl {
  public readonly tokens: TextRangeCollection<Token>;
  
  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    // Instruction operands are a sequence 'fragment, fragment, ...'.
    // Fragment may include whitespace when it is an expression or an indirect.
    // Consider INSTR x1, [ x2 ], (1 + 2). We let code analysis/validation deal
    // with any errors like missing braces, incorrect number of operands, etc.
    // Parser only fills data structures for the subsequent analysis pass.
    
    const ts = context.tokens;
    // Collect all tokens until comma or EOL.
    while(!ts.isEndOfLine() && ts.currentToken.tokenType !== TokenType.Comma) {
      this.appendChild(new TokenNode(ts.currentToken));
      ts.moveToNextToken();
    }
    return this.children.count > 0;
  }
}

export namespace Operand {
  export function parseOperands(context: ParseContext): void {
    // Collect operands
    const ts = context.tokens;
    while (!ts.isEndOfLine()) {
      const ct = ts.currentToken;

      if (ct.tokenType === TokenType.Comma) {
        if (context.previousToken.tokenType === TokenType.Comma) {
          context.addError(new ParseError(ParseErrorType.OperandExpected, ErrorLocation.Token, ts.currentToken));
        }
        this.appendChild(TokenNode.create(context, this));
        if (ts.isEndOfLine()) {
          context.addError(new ParseError(ParseErrorType.UnexpectedEndOfLine, ErrorLocation.Token, ts.previousToken));
        }
        continue;
      }

      const operand = new Operand();
      operand.parse(context, this);
      this.appendChild(operand);

      context.tokens.moveToNextToken();
    }
  }
}
