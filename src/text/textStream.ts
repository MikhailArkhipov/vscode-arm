// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextProvider } from "./text";

export class TextStream implements TextProvider {
  private readonly _text: string;

  constructor(text: string) {
    this._text = text;
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
    const start = Math.max(position, 0);
    const end = Math.min(position + length, this._text.length);
    return this._text.substring(start, end);
  }

  public indexOf(ch: string, startPosition: number): number {
    return this._text.indexOf(ch, startPosition);
  }

  public compareTo(position: number, length: number, text: string, ignoreCase: boolean): boolean {
    if (position < 0 || position >= this._text.length) {
      return text.length == 0;
    }

    const start = Math.max(position, 0);
    const end = Math.min(position + length, this._text.length);
    const part = this._text.substring(start, end);

    if (ignoreCase) {
      return part.match(`/${text}/i`) ? true : false;
    }
    return part === text;
  }
}
