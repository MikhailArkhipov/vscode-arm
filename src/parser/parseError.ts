// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextRange, TextRangeImpl } from "../text/textRange";
import { Token } from "../tokens/tokens";

export enum ParseErrorType {
  None,
  UnexpectedToken,

  Label_InvalidName,
  Label_Unknown,

  InstructionOrDirectiveExpected,

  UnknownInstruction,
  InvaldInstructionName,
  SuffixNotAllowed,
  ModifierNotAllowed,
  TypeNotAllowed,
  InvalidModifier,
  UnknownModifier,
  InvalidType,
  InvalidEffect,
  
  InvalidDirectiveName,
  Directive_Unknown,

  OperandExpected,
  //DataExpected,
  //NumberExpected,
  //StringExpected,
  //ExpressionExpected,
  //OperatorExpected,
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

  constructor(
    errorType: ParseErrorType,
    location: ErrorLocation,
    range: TextRange
  ) {
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
