// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { AssemblerConfig } from "../syntaxConfig";
import { TextProvider } from "../text/text";
import { TextRangeCollection } from "../text/textRangeCollection";
import { TokenStream } from "../tokens/tokenStream";
import { Token } from "../tokens/tokens";
import { ParseError } from "./parseError";

export class ParseContext {
  public readonly text: TextProvider;
  public readonly config: AssemblerConfig;
  public readonly tokens: TokenStream;
  public readonly comments: TextRangeCollection<Token>;
  public readonly version: number;

  private readonly _errors: ParseError[] = [];

  constructor(
    text: TextProvider,
    config: AssemblerConfig,
    tokens: TokenStream,
    comments: TextRangeCollection<Token>,
    version: number
  ) {
    this.text = text;
    this.config = config;
    this.tokens = tokens;
    this.comments = comments;
    this.version = version;
  }

  public get errors(): TextRangeCollection<ParseError> {
    return new TextRangeCollection(this._errors);
  }

  public addError(error: ParseError): void {
    const found = this._errors.find(
      (e) =>
        e.start == error.start &&
        e.length == error.length &&
        e.errorType == error.errorType
    );
    if (!found) {
      this._errors.push(error);
    }
  }
}
