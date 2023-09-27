// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { CharacterStream } from "./characterStream";
import { TextStream } from "./textStream";

export class StringReader {
  private readonly _cs: CharacterStream;

  constructor(text: string) {
    this._cs = new CharacterStream(new TextStream(text));
  }

  public readLine(): string | undefined {
    if(this._cs.isEndOfStream()) {
      return;
    }
    if(this._cs.isAtNewLine()) {
      this._cs.skipLineBreak();
      return ''; // empty lines are preserved
    }
    const start = this._cs.position;
    this._cs.moveToEol();
    const result = this._cs.text.getText(start, this._cs.position - start);
    this._cs.skipLineBreak();
    return result;
  } 
}