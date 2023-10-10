// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ErrorLocation, ParseErrorType } from '../AST/definitions';
import { TextRange, TextRangeImpl } from '../text/definitions';
import { Token } from '../tokens/definitions';

export class ParseErrorImpl extends TextRangeImpl {
  public readonly errorType: ParseErrorType;
  public readonly location: ErrorLocation;

  constructor(errorType: ParseErrorType, location: ErrorLocation, range: TextRange) {
    super(range.start, range.length);
    this.errorType = errorType;
    this.location = location;
  }
}

export class UnexpectedItemError extends ParseErrorImpl {
  constructor(errorType: ParseErrorType, range: TextRange) {
    super(errorType, ErrorLocation.Token, range);
  }
}
export class MissingItemError extends ParseErrorImpl {
  constructor(errorType: ParseErrorType, token: Token) {
    super(errorType, ErrorLocation.AfterToken, token);
  }
}

