// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.
"use strict";

import { Char, Character } from "./charCodes";
import { TextProvider } from "./text";
import { TextRange } from "./textRange";
import { TextStream } from "./textStream";

/**
 * Helper class that represents stream of characters
 */
export class CharacterStream {
  private readonly _range: TextRange;
  private _position: number;
  private _isEndOfStream: boolean;
  private _currentChar: number;
  private _nextChar: number;
  private _prevChar: number;

  public readonly text: TextProvider;

  public constructor(textProvider: TextProvider, range?: TextRange) {
    this.text = textProvider;
    const start = range ? range.start : 0;
    const length = range ? range.length : textProvider.length;
    this._range = TextRange.create(start, length);
    this.position = this._range.start;
  }

  public get position(): number {
    return this._position;
  }

  public set position(value: number) {
    this._position = value;

    if (this._position < 0) {
      this._position = 0;
    }

    const maxPosition = Math.min(this.text.length, this._range.end);

    this._isEndOfStream = this._position >= maxPosition;
    if (this._isEndOfStream) {
      this._position = maxPosition;
    }

    this._currentChar = 0;
    this._prevChar = 0;
    this._nextChar = 0;
  }

  public get length(): number {
    return this.text.length;
  }

  public isEndOfStream(): boolean {
    return this._isEndOfStream || this._position >= this.text.length;
  }

  public get currentChar(): number {
    if (this._currentChar === 0) {
      this._currentChar = this.text.charCodeAt(this.position);
    }
    return this._currentChar;
  }

  public get nextChar(): number {
    if (this._nextChar === 0) {
      this._nextChar = this.position + 1 < this._range.end ? this.text.charCodeAt(this.position + 1) : 0;
    }
    return this._nextChar;
  }

  public get prevChar(): number {
    if (this._prevChar === 0) {
      this._prevChar = this.position > this._range.start ? this.text.charCodeAt(this.position - 1) : 0;
    }
    return this._prevChar;
  }

  public lookAhead(offset: number): string {
    return this.text.charAt(this.position + offset);
  }

  public advance(offset: number) {
    this.position += offset;
  }

  public moveToNextChar(): boolean {
    if (this._position < this._range.end - 1) {
      // Most common case, no need to check bounds extensively
      this._position++;
      this._prevChar = this._currentChar;
      this._currentChar = this._nextChar;
      this._nextChar = 0;
      return true;
    }

    this.advance(1);
    return !this.isEndOfStream();
  }

  public moveToEol(): void {
    while (!this.isEndOfStream() && !this.isAtNewLine()) {
      this.moveToNextChar();
    }
  }

  public moveToNextLine(): void {
    this.moveToEol();
    this.skipLineBreak();
  }

  public isWhiteSpace(): boolean {
    return Character.isWhitespace(this.currentChar);
  }

  public isAtNewLine(): boolean {
    return Character.isNewLine(this.currentChar);
  }

  public skipLineBreak(): void {
    while (this.currentChar === Char.LineFeed || this.currentChar === Char.CarriageReturn) {
      this.moveToNextChar();
    }
  }

  public skipToWhitespace(): void {
    while (!this.isEndOfStream() && !this.isWhiteSpace()) {
      this.moveToNextChar();
    }
  }

  public skipWhitespace(): void {
    while (!this.isEndOfStream() && this.isWhiteSpace()) {
      this.moveToNextChar();
    }
  }

  public isAtString(): boolean {
    return this.currentChar === Char.DoubleQuote;
  }
}

export namespace CharacterStream {
  export function fromString(text: string): CharacterStream {
    return new CharacterStream(new TextStream(text));
  }
}
