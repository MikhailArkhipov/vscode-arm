// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextDocument } from "vscode";
import { AstRoot } from "../AST/astRoot";
import { Parser } from "../parser/parser";
import { TextStream } from "../text/textStream";
import { AssemblerType, SyntaxConfig } from "../syntaxConfig";
import { Tokenizer } from "../tokens/tokenizer";
import { Token } from "../tokens/tokens";
import { TextRangeCollection } from "../text/textRangeCollection";

export class EditorDocument {
  private readonly _td: TextDocument;
  private _ast: AstRoot | undefined;
  private _tokens: TextRangeCollection<Token>;
  private _version: number;

  constructor(td: TextDocument) {
    this._td = td;
  }

  public get ast(): AstRoot {
    if (!this._ast || this._ast.context.version !== this._td.version) {
      var p = new Parser();
      this._ast = p.parse(
        new TextStream(this._td.getText()),
        EditorDocument.syntaxConfig,
        this._td.version
      );
    }
    return this._ast;
  }

  public get tokens(): TextRangeCollection<Token> {
    // We are not building ASTs just yet, so provide tokens explicitly.
    if (!this._tokens || this._version !== this._td.version) {
      const t = new Tokenizer(SyntaxConfig.create(AssemblerType.GNU));
      const text = this._td.getText();
      this._tokens = t.tokenize(
        new TextStream(text),
        0,
        text.length,
        false
      ).tokens;
    }
    return this._tokens;
  }
}

export namespace EditorDocument {
  export const syntaxConfig = SyntaxConfig.create(AssemblerType.GNU);
}
