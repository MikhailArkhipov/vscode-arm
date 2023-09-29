// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import {
  CancellationToken,
  Diagnostic,
  DiagnosticSeverity,
  Position,
  Range,
  TextDocument,
  languages,
  window,
} from 'vscode';
import { TextStream } from '../text/textStream';
import { Tokenizer } from '../tokens/tokenizer';
import { AstRoot } from '../AST/definitions';
import { getLanguageOptions } from './options';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { LanguageOptions } from '../core/languageOptions';
import { getParseErrorMessage } from './messages';
import { TextRangeCollectionImpl } from '../text/textRangeCollection';
import { TextRangeCollection } from '../text/definitions';
import { Token } from '../tokens/definitions';

export class EditorDocument {
  private readonly _diagnosticsCollection = languages.createDiagnosticCollection('vscode-arm');
  private readonly _td: TextDocument;

  // Raw token collection - it including comments
  private _tokens: TextRangeCollection<Token> = new TextRangeCollectionImpl();
  private _options: LanguageOptions;
  private _ast: AstRoot | undefined;
  private _version = 0;

  constructor(td: TextDocument) {
    this._td = td;
  }

  public get textDocument(): TextDocument {
    return this._td;
  }

  public getAst(): AstRoot | undefined {
    if (!this._ast || this._ast.version < this._td.version) {
      // this._ast = AstRootImpl.create(this._td.getText(), this._options, this.tokens, this._td.version);
    }
    return this._ast;
  }

  public get tokens(): TextRangeCollection<Token> {
    if (!this._tokens || this._version !== this._td.version) {
      this._options = getLanguageOptions();
      const t = new Tokenizer(this._options);
      const text = this._td.getText();
      const tokenArray = t.tokenize(new TextStream(text), 0, text.length);
      this._tokens = new TextRangeCollectionImpl(tokenArray);
    }
    return this._tokens;
  }

  public getCaretPosition(): Position | undefined {
    const editor = window.activeTextEditor;
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

  public onIdle(ct: CancellationToken): void {
    this.updateDiagnostics(ct);
  }

  private async updateDiagnostics(ct: CancellationToken): Promise<void> {
    this._diagnosticsCollection.clear();
    if (ct.isCancellationRequested) {
      return;
    }

    const diagnostics: Diagnostic[] = [];
    if (this._ast) {
      this._ast.errors.forEach((e) => {
        const range = new Range(this._td.positionAt(e.start), this._td.positionAt(e.end));
        const d = new Diagnostic(range, getParseErrorMessage(e.errorType), DiagnosticSeverity.Warning);
        diagnostics.push(d);
      });
    }

    if (!ct.isCancellationRequested) {
      this._diagnosticsCollection.set(this._td.uri, diagnostics);
    }
  }
}
