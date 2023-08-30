// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextRangeCollection } from "../text/textRangeCollection";
import { Token, TokenType } from "./tokens";

// Generic token stream. Allows fetching tokens safely, returns special end of stream
// tokens even before start  or beyond end of stream. Allows looking beyound end of
// the stream avoiding exceptions from out of bound operations.
export class TokenStream {
  private readonly _tokens: TextRangeCollection<Token>;
  private readonly _endOfStreamToken: Token;
  private _index: number = 0;
  private _isEndOfStream: boolean;
  private _currentToken: Token;

  constructor(tokens: TextRangeCollection<Token>, endOfStreamToken: Token) {
    this._tokens = tokens;
    this._endOfStreamToken = endOfStreamToken;
  }

  public get position(): number {
    return this._index;
  }
  public set position(value) {
    this._index = value;
    this.checkBounds();
  }

  public get currentToken(): Token {
    return this._currentToken;
  }

  public getTokenAt(position: number): Token {
    if (position >= 0 && position < this._tokens.count) {
      return this._tokens[position];
    }
    return this._endOfStreamToken;
  }

  public lookAhead(count: number): Token {
    return this.getTokenAt(this._index + count);
  }

  public get nextToken(): Token {
    return this.lookAhead(1);
  }

  public get previousToken(): Token {
    return this.lookAhead(-1);
  }

  public isEndOfStream(): boolean {
    return this._isEndOfStream;
  }

  public isEndOfLine(): boolean {
    return this.isEndOfStream() || this.currentToken.tokenType === TokenType.EndOfLine;
  }

  public moveToNextToken(): Token {
    if (this._index < this._tokens.count - 1) {
      this._index++;
      this._currentToken = this._tokens.getItemAt(this._index);
      return this._currentToken;
    }
    return this.advance(1);
  }

  public advance(count: number): Token {
    this._index += count;
    this.checkBounds();
    return this._currentToken;
  }

  private checkBounds(): void {
    if (this._index < 0) {
      this._index = 0;
    } else if (this._index >= this._tokens.count) {
      this._index = this._tokens.count;
    }

    this._isEndOfStream = this._index >= this._tokens.count;
    this._currentToken = this._isEndOfStream ? this._endOfStreamToken : this._tokens[this._index];
  }
}
