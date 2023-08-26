// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

namespace Text {
  class ASCII {
    static A: number = "A".charCodeAt(0); // 'A'
    static F: number = "F".charCodeAt(0); // 'F'
    static Z: number = "Z".charCodeAt(0); // 'Z'
    static a: number = "a".charCodeAt(0); // 'a'
    static f: number = "f".charCodeAt(0); // 'f'
    static z: number = "z".charCodeAt(0); // 'z'
    static n0: number = "0".charCodeAt(0); // '0'
    static n9: number = "9".charCodeAt(0); // '9'
    static SQ: number = "'".charCodeAt(0); // single quote
    static DQ: number = '"'.charCodeAt(0); // double quote
    static CR: number = "\r".charCodeAt(0);
    static LF: number = "\n".charCodeAt(0);
  }

  /**
   * Helper class that represents stream of characters
   */
  export class CharacterStream {
    private readonly _range: TextRange;
    private _position: number;
    private _isEndOfStream: boolean;
    private _currentChar: string;
    private _currentCode: number;

    public readonly text: ITextProvider;

    public constructor(textProvider: ITextProvider, range?: ITextRange) {
      this.text = textProvider;
      this._range = TextRange.FromBounds(range?.start, range?.end);
      this._position = this._range.start;
      this._currentChar = this.text.charAt(this._position);
      this._currentCode = this.currentChar.charCodeAt(0);
    }

    public static FromString(text: string): CharacterStream {
      return new CharacterStream(new TextStream(text));
    }

    public get position(): number {
      return this._position;
    }

    public set position(value: number) {
      this._position = value;
      this.checkBounds();
    }

    public get length(): number {
      return this.text.length;
    }

    public isEndOfStream(): boolean {
      return this._isEndOfStream;
    }

    public get distanceFromEnd(): number {
      return this._range.end - this._position;
    }

    public get currentChar(): string {
      return this._currentChar;
    }

    public get currentCode(): number {
        return this._currentCode;
      }

      public get nextChar(): string {
      return this.position + 1 < this._range.end ? this.text.getText(this.position + 1, 1) : "\0";
    }

    public get prevChar(): string {
      return this.position > this._range.start ? this.text.getText(this.position - 1, 1) : "\0";
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
        this._currentChar = this.text.charAt(this._position);
        this._currentCode = this._currentChar.charCodeAt(0);
        return true;
      }

      this.advance(1);
      return !this.isEndOfStream();
    }

    public isWhiteSpace(): boolean {
      return this._currentCode === 0x20;
    }

    public isAtNewLine(): boolean {
      return CharacterStream.IsNewLine(this._currentCode);
    }

    public static IsNewLine(ch: number) {
      return ch === ASCII.CR || ch === ASCII.LF;
    }

    public skipLineBreak(): void {
      if (this._currentCode === ASCII.LF) {
        this.moveToNextChar();
        if (this._currentCode === ASCII.CR) {
          this.moveToNextChar();
        }
      } else if (this._currentCode === ASCII.CR) {
        this.moveToNextChar();
        if (this._currentCode === ASCII.LF) {
          this.moveToNextChar();
        }
      }
    }

    public skipToEol(): void {
      while (!this.isEndOfStream() && !this.isAtNewLine()) {
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

    public isLetter(): boolean {
      return CharacterStream.IsLetter(this.currentChar);
    }

    public static IsLetter(ch: string): boolean {
      return ch.toLocaleLowerCase() != ch.toLocaleUpperCase();
    }

    public isHex(): boolean {
      return CharacterStream.IsHex(this._currentCode);
    }

    public static IsHex(ch: number): boolean {
      return CharacterStream.IsDecimal(ch) || (ch >= ASCII.A && ch <= ASCII.F) || (ch >= ASCII.a && ch <= ASCII.f);
    }

    public isDecimal(): boolean {
      return CharacterStream.IsDecimal(this._currentCode);
    }

    public static IsDecimal(ch: number): boolean {
      return ch >= ASCII.n0 && ch <= ASCII.n9;
    }

    public isAnsiLetter(): boolean {
      return CharacterStream.IsAnsiLetter(this._currentCode);
    }

    /// <summary>
    /// Determines if current character is an ANSI letter
    /// </summary>
    public static IsAnsiLetter(ch: number): boolean {
      return (ch >= ASCII.A && ch <= ASCII.Z) || (ch >= ASCII.a && ch <= ASCII.z);
    }

    /// <summary>
    /// Determines if current character starts a string (i.e. current character is a single or double quote).
    /// </summary>
    public isAtString(): boolean {
      return this._currentCode === ASCII.SQ || this._currentCode === ASCII.DQ;
    }

    private checkBounds(): void {
      if (this._position < 0) {
        this._position = 0;
      }

      var maxPosition = Math.min(this.text.length, this._range.end);

      this._isEndOfStream = this._position >= maxPosition;
      if (this._isEndOfStream) {
        this._position = maxPosition;
      }

      this._currentChar = this._isEndOfStream ? "\0" : this.text.getText(this.position, 1);
    }
  }
}
