// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseErrorType } from "../parser/parseError";
import { ParseContext } from "../parser/parser";
import { Char } from "../text/charCodes";
import { Token } from "../tokens/tokens";
import { AstNode } from "./astNode";
import { Statement } from "./statement";

// INSTR12.I8
export class Instruction extends Statement {
  protected checkStatementName(text: string): ParseErrorType | undefined {
      if(!Token.isInstructionName(text)) {
        return ParseErrorType.InstructionName;
      }
  }
}

export namespace Instruction {
  export function create(context: ParseContext, parent: AstNode): Instruction | undefined {
    var ch = context.text.charCodeAt(context.tokens.currentToken.start);
    if (ch !== Char.Period) {
      var instruction = new Instruction();
      if (instruction.parse(context, parent)) {
        return instruction;
      }
    }
  }
}
