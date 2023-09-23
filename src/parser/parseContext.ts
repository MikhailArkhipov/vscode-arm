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
  // used when parsing comma-separated lists
  public terminatingTokenType: TokenType;

  private readonly _errors: ParseError[] = [];

  constructor(text: TextProvider, config: AssemblerConfig, ts: TokenStream, version: number) {
    this.text = text;
    this.config = config;
    this.version = version;

    const filtered = this.filterOutComments(ts);
    this.tokens = new TokenStream(filtered.tokens);
    this.comments = filtered.comments;
  }

  public get currentToken(): Token {
    return this.tokens.currentToken;
  }
  public get nextToken(): Token {
    return this.tokens.nextToken;
  }
  public get previousToken(): Token {
    return this.tokens.previousToken;
  }
  public moveToNextToken(): void {
    this.tokens.moveToNextToken();
  }
  public getTokenText(t: Token): string {
    return this.text.getText(t.start, t.length);
  }
  public getCurrentTokenText(): string {
    return this.getTokenText(this.currentToken);
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

export namespace ParseContext {
  export function getMatchingBraceToken(tokenType: TokenType): TokenType {
    switch (tokenType) {
      case TokenType.OpenBrace:
        return TokenType.CloseBrace;
      case TokenType.CloseBrace:
        return TokenType.OpenBrace;

      case TokenType.OpenBracket:
        return TokenType.CloseBracket;
      case TokenType.CloseBracket:
        return TokenType.OpenBracket;

      case TokenType.OpenCurly:
        return TokenType.CloseCurly;
      case TokenType.CloseCurly:
        return TokenType.OpenCurly;
    }

    throw new Error('Parser: unknown brace type');
  }
}
