// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextProvider } from "../text/text";
import { TextRange, TextRangeImpl } from "../text/textRange";
import { TextRangeCollection } from "../text/textRangeCollection";
import { AssemblerConfig } from "../tokens/tokenizer";
import { Token, TokenType } from "../tokens/tokens";
import { AstNode, AstNodeImpl } from "./astNode";
import { ParseContext } from "../parser/parser";
import { Directive } from "./directive";
import { Statement } from "./statement";

export class AstRoot extends AstNodeImpl {
  public readonly labels: TextRangeCollection<Token>;
  public readonly variables: TextRangeCollection<Token>;

  private _text: TextProvider;
  private _config: AssemblerConfig;
  private _comments: TextRangeCollection<Token>;
  private _statements: Statement[];

  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    this._text = context.text;
    this._config = context.config;
    this._comments = context.comments;

    var t = context.tokens;
    var statements: Statement[] = [];

    while (!t.isEndOfStream()) {
      var statement = Statement.create(context, this);
      if (statement != null) {
        if (statement.parse(context, this)) {
          statements.push(statement);
        } else {
          statement = undefined;
        }
      }
    }
    return super.parse(context, this);
  }
  
  public get text(): TextProvider {
    return this._text;
  }

  public get config(): AssemblerConfig {
    return this._config;
  }

  public get comments(): TextRangeCollection<Token> {
    return this._comments;
  }

  public get statements(): TextRangeCollection<Statement> {
    return new TextRangeCollection(this._statements);
  }
}
