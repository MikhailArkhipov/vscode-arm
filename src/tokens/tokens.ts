// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextRangeImpl } from '../text/definitions';
import { Token, TokenSubType, TokenType } from './definitions';

/**
 * Describes a token. Parse token is a text range with a type that describes nature of the range.
 */
export class TokenImpl extends TextRangeImpl implements Token {
  public readonly type: TokenType;
  // Only set by tokenType the parser while building the AST. Charifies if 'symbol' is 'instruction'
  // or 'register' - information useful to semantic colorizer as well as to the syntax checker.
  public subType: TokenSubType;

  constructor(type: TokenType, start: number, length: number) {
    super(start, length);
    this.type = type;
    this.subType = TokenSubType.None;
  }
}
