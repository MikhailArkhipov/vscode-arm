// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextProvider } from "../text/text";
import { TextRangeCollection } from "../text/textRangeCollection";
import { Token } from "../tokens/tokens";
import { AstNode, AstNodeImpl } from "./astNode";
import { Statement } from "./statement";
import { AssemblerConfig } from "../syntaxConfig";
import { ParseContext } from "../parser/parseContext";

export class AstRoot extends AstNodeImpl {
  private _labels: Token[];
  private _variables: Token[];
  private _context: ParseContext;

  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    this._context = context;

    while (!context.tokens.isEndOfStream()) {
      var statement = new Statement();
      statement.parse(context, this);
      this.appendChild(statement);
    }
    return super.parse(context, this);
  }

  public get parent(): AstNode {
    return this;
  }

  public get context(): ParseContext {
    return this._context;
  }

  public get text(): TextProvider {
    return this._context.text;
  }

  public get config(): AssemblerConfig {
    return this._context.config;
  }

  public get labels(): TextRangeCollection<Token> {
    return new TextRangeCollection(this._labels);
  }

  public get variables(): TextRangeCollection<Token> {
    return new TextRangeCollection(this._variables);
  }
}
