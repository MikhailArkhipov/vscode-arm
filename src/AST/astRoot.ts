// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextProvider } from '../text/text';
import { Token } from '../tokens/tokens';
import { AstNode, AstRoot, Statement, TokenNode } from './definitions';
import { createStatement } from './statement';
import { ParseContext } from '../parser/parseContext';
import { TextStream } from '../text/textStream';
import { LanguageOptions } from '../core/languageOptions';
import { AstNodeImpl } from './astNode';

export class AstRootImpl extends AstNodeImpl implements AstRoot {
  private _context: ParseContext;

  constructor() {
    super();
    this._parent = this;
  }

  // Recursice descent parser
  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    this._context = context;

    // Code is a sequence of statements. Statement can be a directive, instruction
    // or an empty line. Empty line is still recorded as an empty statement
    // since it helps formatter to preserve blank lines as needed. Anything that is
    // not recognized is recorded as an 'unknown statement'.
    while (!context.tokens.isEndOfStream()) {
      const statement = createStatement(context);
      statement.parse(context, this);

      if (!context.tokens.isEndOfLine()) {
        throw Error('Parser: must be at the end of a line.');
      }
      // Skip line break. Thi is no-op at the end of the file
      context.moveToNextToken();
    }
    // Rewind back as a courtesy to potential users downstream.
    this.context.tokens.position = 0;
    return true;
  }

  public static create(text: string, options: LanguageOptions, tokens: readonly Token[], version = 0): AstRoot {
    const ts = new TextStream(text);
    const ast = new AstRootImpl();
    const context = new ParseContext(ast, ts, options, tokens, version);
    ast.parse(context);
    return ast;
  }

  public get context(): ParseContext {
    return this._context;
  }

  public get text(): TextProvider {
    return this._context.text;
  }

  public get options(): LanguageOptions {
    return this._context.options;
  }

  public get labels(): readonly Token[] {
    return this.statements
      .filter((s) => {
        const tn = s.label as TokenNode;
        return tn.token && tn.token.type;
      })
      .map((s) => (s.label as TokenNode).token);
  }

  public get statements(): readonly Statement[] {
    return this.children
      .asArray()
      .map((e) => e as Statement)
      .filter((e) => e);
  }
}
