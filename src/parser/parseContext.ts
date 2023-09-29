// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { AstRoot, ParseError, TokenNode } from '../AST/definitions';
import { LanguageOptions } from '../core/languageOptions';
import { TextProvider, TextRangeCollection } from '../text/definitions';
import { TextRangeCollectionImpl } from '../text/textRangeCollection';
import { Token, TokenType } from '../tokens/definitions';
import { TokenStream } from '../tokens/tokenStream';

export class ParseContext {
  public readonly text: TextProvider;
  public readonly options: LanguageOptions;
  public readonly tokens: TokenStream; // Removed comments
  public readonly rawTokens: TextRangeCollection<Token>; // Includes comments
  public readonly version: number;
  public readonly root: AstRoot;

  private readonly _errors: ParseError[] = [];
  // Tokens that define a symbol, i.e. .equ, .set and similar.
  private readonly _definitions: TokenNode[] = [];
  // Tokens that declare variable (data) like 'name: .word 1'.
  private readonly _declarations: TokenNode[] = [];
  // Tokens that reference variable or symbol, i.e. something
  // that may appear in the instruction operands.
  private readonly _references: TokenNode[] = [];

  constructor(root: AstRoot, text: TextProvider, options: LanguageOptions, tokens: readonly Token[], version: number) {
    this.root = root;
    this.text = text;
    this.options = options;
    this.version = version;

    this.rawTokens = new TextRangeCollectionImpl(tokens);
    this.tokens = new TokenStream(tokens.filter((t) => !Token.isComment(t)));
  }

  public get errors(): readonly ParseError[] {
    return this._errors;
  }
  public get definitions(): readonly TokenNode[] {
    return this._definitions;
  }
  public get declarations(): readonly TokenNode[] {
    return this._declarations;
  }

  public addError(error: ParseError): void {
    const found = this._errors.find(
      (e) => e.start === error.start && e.length === error.length && e.errorType === error.errorType
    );
    if (!found) {
      this._errors.push(error);
    }
  }

  // Variable and defines collection.
  public addDefinition(tokenNode: TokenNode): void {
    // Duplicates are OK and are detected later.
    this._definitions.push(tokenNode);
  }
  public addDeclaration(tokenNode: TokenNode): void {
    // Duplicates are OK and are detected later.
    this._declarations.push(tokenNode);
  }
  public addReference(tokenNode: TokenNode): void {
    this._references.push(tokenNode);
  }

  // Utility
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
