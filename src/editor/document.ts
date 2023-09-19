// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as vscode from 'vscode';

import { Position, Range, TextDocument } from 'vscode';
import { TextStream } from '../text/textStream';
import { AssemblerType, SyntaxConfig } from '../syntaxConfig';
import { Tokenizer } from '../tokens/tokenizer';
import { Token, TokenType } from '../tokens/tokens';
import { TextRangeCollection } from '../text/textRangeCollection';

export class EditorDocument {
  private readonly _td: TextDocument;
  //private _ast: AstRoot | undefined;
  private _tokens: TextRangeCollection<Token>;
  private _version: number;

  constructor(td: TextDocument) {
    this._td = td;
  }

  // public get ast(): AstRoot {
  //   if (!this._ast || this._ast.context.version !== this._td.version) {
  //     const p = new Parser();
  //     this._ast = p.parse(new TextStream(this._td.getText()), EditorDocument.syntaxConfig, this._td.version);
  //   }
  //   return this._ast;
  // }

  public get tokens(): TextRangeCollection<Token> {
    // We are not building ASTs just yet, so provide tokens explicitly.
    if (!this._tokens || this._version !== this._td.version) {
      const t = new Tokenizer(SyntaxConfig.create(AssemblerType.GNU));
      const text = this._td.getText();
      this._tokens = t.tokenize(new TextStream(text), 0, text.length, false).tokens;
    }
    return this._tokens;
  }

  public isComment(tokenIndex: number): boolean {
    // Locate matching document in RDT
    if (tokenIndex >= 0) {
      const t = this._tokens.getItemAt(tokenIndex);
      return t.tokenType === TokenType.LineComment || t.tokenType === TokenType.BlockComment;
    }
    return false;
  }

  public getCaretPosition(): Position | undefined {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      return editor.selection.isEmpty ? editor.selection.start : editor.selection.anchor;
    }
  }

  public getCaretOffset(): number | undefined {
    const position = this.getCaretPosition();
    return position ? this._td.offsetAt(position) : undefined;
  }

  public getTokenIndexUnderCaret(): number | undefined {
    const offset = this.getCaretOffset();
    return offset ? this.getTokenIndexContainingOffset(offset) : undefined;
  }

  public getTokenIndexContainingPosition(position: Position): number | undefined {
    const offset = this._td.offsetAt(position);
    return this.getTokenIndexContainingOffset(offset);
  }

  public getTokenIndexContainingOffset(offset: number): number | undefined {
    return this._tokens.getItemContaining(offset);
  }

  public getTokenText(tokenIndex: number): string {
    const t = this._tokens.getItemAt(tokenIndex);
    const range = new Range(this._td.positionAt(t.start), this._td.positionAt(t.end));
    return this._td.getText(range);
  }
}

export namespace EditorDocument {
  export const syntaxConfig = SyntaxConfig.create(AssemblerType.GNU);
}
