// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextProvider } from "./text";

export class TextStream implements TextProvider {
  private readonly _text: string;
  private _version: number;

  constructor(text: string, version: number = 0) {
    this._text = text;
    this._version = version;
  }

  public static readonly Empty = new TextStream("");

  public get length() {
    return this._text.length;
  }

  public charAt(position: number): string {
    if (position < 0 || position >= this._text.length) {
      return "\0";
    }
    return this._text.charAt(position);
  }

  public charCodeAt(position: number): number {
    if (position < 0 || position >= this._text.length) {
      return 0;
    }
    return this._text.charCodeAt(position);
  }

  public getText(position: number = 0, length: number = 0): string {
    if (length === 0 || position >= this._text.length) {
      return "";
    }
    var start = Math.max(position, 0);
    var end = Math.min(position + length, this._text.length);
    return this._text.substring(start, end);
  }

  public indexOf(ch: string, startPosition: number): number {
    return this._text.indexOf(ch, startPosition);
  }

  public compareTo(position: number, length: number, text: string, ignoreCase: boolean): boolean {
    if (position < 0 || position >= this._text.length) {
      return text.length == 0;
    }

    var start = Math.max(position, 0);
    var end = Math.min(position + length, this._text.length);
    var part = this._text.substring(start, end);

    if (ignoreCase) {
      return part.match(`/${text}/i`) ? true : false;
    }
    return part === text;
  }

  public get version(): number {
    return this._version;
  }
}
