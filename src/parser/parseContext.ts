// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { AssemblerConfig } from '../core/syntaxConfig';
import { TextProvider } from '../text/text';
import { TextRangeCollection } from '../text/textRangeCollection';
import { TokenStream } from '../tokens/tokenStream';
import { Token, TokenType } from '../tokens/tokens';
import { ParseError } from './parseError';

export class ParseContext {
  public readonly text: TextProvider;
  public readonly config: AssemblerConfig;
  public readonly tokens: TokenStream;
  public readonly comments: TextRangeCollection<Token>;
  public readonly version: number;

  private readonly _errors: ParseError[] = [];

  constructor(text: TextProvider, config: AssemblerConfig, ts: TokenStream, version: number) {
    this.text = text;
    this.config = config;
    this.version = version;

    const filtered = this.filterOutComments(ts);
    this.tokens = new TokenStream(filtered.tokens);
    this.comments = filtered.comments;
  }

  public get errors(): TextRangeCollection<ParseError> {
    return new TextRangeCollection(this._errors);
  }

  public addError(error: ParseError): void {
    const found = this._errors.find(
      (e) => e.start === error.start && e.length === error.length && e.errorType === error.errorType
    );
    if (!found) {
      this._errors.push(error);
    }
  }

  private filterOutComments(ts: TokenStream): {
    tokens: TextRangeCollection<Token>;
    comments: TextRangeCollection<Token>;
  } {
    // Separate comments in order to simplify parsing.
    const filteredTokens: Token[] = [];
    const commentTokens: Token[] = [];
    while (!ts.isEndOfStream()) {
      if (ts.currentToken.tokenType === TokenType.BlockComment || ts.currentToken.tokenType === TokenType.LineComment) {
        commentTokens.push(ts.currentToken);
      } else {
        filteredTokens.push(ts.currentToken);
      }
      ts.moveToNextToken();
    }

    return {
      tokens: new TextRangeCollection(filteredTokens),
      comments: new TextRangeCollection(commentTokens),
    };
  }
}
