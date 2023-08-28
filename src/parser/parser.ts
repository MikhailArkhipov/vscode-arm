// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextProvider } from "../text/text";
import { TextRangeCollection } from "../text/textRangeCollection";
import { TokenStream } from "../tokens/tokenStream";
import { AssemblerConfig, Tokenizer } from "../tokens/tokenizer";
import { Token, TokenType } from "../tokens/tokens";
import { AstNode } from "../AST/astNode";
import { AstRoot } from "../AST/astRoot";
import { ParseError } from "./parseError";

export class ParseContext {
  public readonly text: TextProvider;
  public readonly config: AssemblerConfig;
  public readonly root: AstRoot;
  public readonly tokens: TokenStream;
  public readonly comments: TextRangeCollection<Token>;

  private readonly _errors: ParseError[] = [];

  constructor(
    text: TextProvider,
    config: AssemblerConfig,
    root: AstRoot,
    tokens: TokenStream,
    comments: TextRangeCollection<Token>
  ) {
    this.text = text;
    this.config = config;
    this.root = root;
    this.tokens = tokens;
    this.comments = comments;
  }

  public get errors(): TextRangeCollection<ParseError> {
    return new TextRangeCollection(this._errors);
  }

  public addError(error: ParseError): void {
    var found = this._errors.find((e) => e.start == error.start && e.length == error.length && e.errorType == error.errorType);
    if (!found) {
      this._errors.push(error);
    }
  }
}

export interface ParseItem {
  parse(context: ParseContext, parent?: AstNode): boolean;
}

export class Parser {
  private _labels: Token[] = [];
  private _variables: Token[] = [];

  public parse(text: TextProvider, config: AssemblerConfig): AstRoot {
    this._labels = [];
    this._variables = [];

    var t = new Tokenizer(config);
    var result = t.tokenize(text, 0, text.length, true);

    var root = new AstRoot();
    var ts = new TokenStream(result.tokens, new Token(TokenType.EndOfStream, 0, 0));
    var context = new ParseContext(text, config, root, ts, result.comments);

    // Recursive descend parser
    root.parse(context, root);
    return root;
  }
}
