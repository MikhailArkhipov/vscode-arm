// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextProvider } from "../text/text";
import { TokenStream } from "../tokens/tokenStream";
import { Tokenizer } from "../tokens/tokenizer";
import { Token } from "../tokens/tokens";
import { AssemblerConfig } from "../syntaxConfig";
import { AstRoot } from "../AST/astRoot";
import { ParseContext } from "./parseContext";

export class Parser {
  private _labels: Token[] = [];
  private _variables: Token[] = [];

  public parse(text: TextProvider, config: AssemblerConfig): AstRoot {
    this._labels = [];
    this._variables = [];

    var t = new Tokenizer(config);
    var result = t.tokenize(text, 0, text.length, true);

    var root = new AstRoot();
    var ts = new TokenStream(result.tokens);
    var context = new ParseContext(text, config, ts, result.comments);

    // Recursive descend parser
    root.parse(context, root);
    return root;
  }
}

