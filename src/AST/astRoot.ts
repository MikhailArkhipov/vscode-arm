// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextProvider } from '../text/text';
import { TextRangeCollection } from '../text/textRangeCollection';
import { Token } from '../tokens/tokens';
import { AstNode, AstNodeImpl } from './astNode';
import { Statement } from './statement';
import { ParseContext } from '../parser/parseContext';
import { AssemblerConfig } from '../core/syntaxConfig';
import { TextStream } from '../text/textStream';
import { TokenStream } from '../tokens/tokenStream';
import { TokenNode } from './tokenNode';

export class AstRoot extends AstNodeImpl {
  private _context: ParseContext;

  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    this._context = context;

    while (!context.tokens.isEndOfStream()) {
      const statement = new Statement();
      statement.parse(context, this);
      this.appendChild(statement);
      
      if(!context.tokens.isEndOfLine()) {
        throw Error('Parser: must be at the end of a line.')
      }
      context.moveToNextToken(); // no-op at the end of the file
    }
    return super.parse(context, this);
  }

  public static create(
    text: string,
    config: AssemblerConfig,
    tokens: TextRangeCollection<Token>,
    version = 0
  ): AstRoot {
    const ts = new TextStream(text);
    const context = new ParseContext(ts, config, new TokenStream(tokens), version);
    const ast = new AstRoot();
    ast.parse(context);
    return ast;
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

  public get labels(): readonly Token[] {
    return this.statements.filter((s) => s.label instanceof TokenNode).map((s) => (s.label as TokenNode).token);
  }

  public get statements(): readonly Statement[] {
    return this.children.items.map((e) => e as Statement);
  }
}
