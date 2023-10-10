// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseErrorType } from '../AST/definitions';

export function getParseErrorMessage(errorType: ParseErrorType, instructionSet: string): string {
  switch (errorType) {
    case ParseErrorType.NameExpected:
      return 'Instruction or directive name expected.';
    case ParseErrorType.UnknownInstruction:
      return `Unknown instruction (${instructionSet} set).`;
    case ParseErrorType.UnknownDirective:
      return 'Unknown directive.';
    case ParseErrorType.UndefinedLabel:
      return 'Undefined label.';
    case ParseErrorType.RegisterExpected:
      return 'Register expected.';
    case ParseErrorType.SymbolExpected:
      return 'Symbol expected.';
    case ParseErrorType.SymbolNameExpected:      
    return 'Symbol name expected.';
    case ParseErrorType.StringExpected:
      return 'String expected.';
    case ParseErrorType.UnexpectedToken:
      return 'Unexpected token.';
    case ParseErrorType.MacroNameExpected:
      return 'Macro name expected.';
  }
  return 'Unknown parse error';
}
