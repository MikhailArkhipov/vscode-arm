// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextRange, TextRangeImpl } from '../text/textRange';
import { Token } from '../tokens/tokens';

export enum ParseErrorType {
  None,
  UnexpectedToken,

  // Assembler expects line to start with label or directive.
  InstructionOrDirectiveExpected,
  // Instruction is not recognized.
  UnknownInstruction,
  // Unknown directive
  UnknownDirective,
  // Instruction references label that is not defined.
  UndefinedLabel,
  // Register is expected at this position.
  RegisterExpected,
  // Instruction must have operands.
  OperandExpected,
  StringExpected,
  OperatorExpected,
  //DataExpected,
  //NumberExpected,
  //ExpressionExpected,
  UnexpectedOperand,
  UnexpectedEndOfFile,
}

export enum ErrorLocation {
  // Whitespace or token before the provided text range. Relatively rare case.
  BeforeToken,
  // The range specified such as when variable in undefined so its reference is squiggled.
  Token,
  // Whitespace after the provided token or end of file. Typical case when required
  // token is missing such as missing close brace or a required operand.
  AfterToken,
}

export enum ErrorSeverity {
  // Informational message, a suggestion
  Informational,
  // Warnings such as obsolete constructs
  Warning,
  // Syntax error
  Error,
  // Fatal error, such as internal product error.
  Fatal,
}

export class ParseError extends TextRangeImpl {
  public readonly errorType: ParseErrorType;
  public readonly location: ErrorLocation;

  constructor(errorType: ParseErrorType, location: ErrorLocation, range: TextRange) {
    super(range.start, range.length);
    this.errorType = errorType;
    this.location = location;
  }
}

export class MissingItemParseError extends ParseError {
  constructor(errorType: ParseErrorType, token: Token) {
    super(errorType, ErrorLocation.AfterToken, token);
  }
}

export class InstructionError extends ParseError {
  constructor(errorType: ParseErrorType, range: TextRange) {
    super(errorType, ErrorLocation.Token, range);
  }
}

export function getMessage(errorType: ParseErrorType): string {
  switch (errorType) {
    case ParseErrorType.UnknownInstruction:
      return 'Unknown instruction.';
    case ParseErrorType.InstructionOrDirectiveExpected:
      return 'Instruction or directive expected.';
    case ParseErrorType.UndefinedLabel:
      return 'Undefined label.';
    case ParseErrorType.UnknownDirective:
      return 'Unknown directive';
    case ParseErrorType.StringExpected:
      return 'String expected';
    case ParseErrorType.RegisterExpected:
      return 'Register expected';
    case ParseErrorType.OperandExpected:
      return 'Operand expected';
    case ParseErrorType.UnexpectedOperand:
      return 'Operand not expected';
  }
  return '???';
}
