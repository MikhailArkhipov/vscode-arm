// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseErrorType } from "../parser/parseError";

export function getParseErrorMessage(errorType: ParseErrorType): string {
  switch (errorType) {
    case ParseErrorType.UnknownInstruction:
      return 'Unknown instruction.';
    case ParseErrorType.InstructionOrDirectiveExpected:
      return 'Instruction or directive expected.';
    case ParseErrorType.UndefinedLabel:
      return 'Undefined label.';
    case ParseErrorType.UnknownDirective:
      return 'Unknown directive.';
    case ParseErrorType.StringExpected:
      return 'String expected.';
    case ParseErrorType.RegisterExpected:
      return 'Register expected.';
    case ParseErrorType.LeftOperandExpected:
      return 'Left operand expected.';
    case ParseErrorType.RightOperandExpected:
      return 'Right operand expected.';
    case ParseErrorType.ExpressionExpected:
      return 'Expression expected.';
    case ParseErrorType.SymbolExpected:
      return 'Symbol expected.';
    case ParseErrorType.CloseBraceExpected:
      return 'Closing brace expected.';
    case ParseErrorType.UnexpectedOperand:
      return 'Operand not expected.';
    case ParseErrorType.UnexpectedEndOfLine:
      return 'Unexpected end of line.';
    case ParseErrorType.UnexpectedEndOfFile:
      return 'Unexpected end of file.';
  }
  return 'Unknown parse error';
}