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
import { LanguageOptions } from '../core/languageOptions';
import { getParseErrorMessage } from './messages';
import { TextRangeCollectionImpl } from '../text/textRangeCollection';
import { TextRangeCollection } from '../text/definitions';
import { Token, TokenType } from '../tokens/definitions';
import { AstRootImpl } from '../AST/astRoot';
import { isRegisterName } from '../tokens/registers';
import { Settings, getSetting } from '../core/settings';

export class EditorDocument {
  private readonly _diagnosticsCollection = languages.createDiagnosticCollection('vscode-arm');
  private readonly _td: TextDocument;

  private _tokens: TextRangeCollection<Token> = new TextRangeCollectionImpl();
  private _options: LanguageOptions;
  private _ast: AstRoot | undefined;
  private _instructionSet = Settings.A64Set;

  constructor(td: TextDocument) {
    this._td = td;

    let iset = getSetting<string>(Settings.instructionSet, 'auto');
    this._instructionSet = iset === 'auto' ? detectInstructionSet(td.getText()) : iset;
  }
  
  public get textDocument(): TextDocument {
    return this._td;
  }
  public get tokens(): TextRangeCollection<Token> {
    return this._ast ? this._ast.tokens : new TextRangeCollectionImpl<Token>();
  }
  public get instructionSet(): string {
    return this._instructionSet;
  }

  public getAst(): AstRoot | undefined {
    if (!this._ast || this._ast.version < this._td.version) {
      this._options = this.getLanguageOptions();
      const t = new Tokenizer(this._options);
      const text = this._td.getText();
      const tokens = t.tokenize(new TextStream(text), 0, text.length);
      this._ast = AstRootImpl.create(this._td.getText(), this._options, tokens, this._td.version);
    }
    return this._ast;
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

  private updateDiagnostics(ct: CancellationToken): void {
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

  // GCC/GAS:
  //   https://sourceware.org/binutils/docs/as/
  //   https://developers.redhat.com/blog/2021/02/26/tips-for-writing-portable-assembler-with-gnu-assembler-gas
  private getLanguageOptions(): LanguageOptions {
    return {
      lineCommentChar: '@', // Line comments start with @
      cLineComments: true, // Allow C++ style line comments i.e. //
      cBlockComments: true, // Allow C block comments /* */
      // GNU-specific.
      hashComments: true,
      isA64: this._instructionSet === Settings.A64Set,
    };
  }
}

function detectInstructionSet(docText: string): string {
  // Tokenize content and see what kind of registers are in use.
  const t = new Tokenizer({
    cBlockComments: true,
    cLineComments: true,
    hashComments: true,
    lineCommentChar: '@',
    isA64: true,
  });
  const symbols = t
    .tokenize(new TextStream(docText), 0, docText.length)
    .filter((t) => t.type === TokenType.Symbol)
    .map((e) => docText.substring(e.start, e.end));
  const score32 = symbols.filter((s) => isRegisterName(s, false)).length;
  const score64 = symbols.filter((s) => isRegisterName(s, true)).length;

  return score32 > score64 && score32 > 5 ? Settings.A32Set : Settings.A64Set;
}
