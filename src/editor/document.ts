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
import { AstRoot, ParseErrorType } from '../AST/definitions';
import { getParseErrorMessage } from './messages';
import { TextRangeCollectionImpl } from '../text/textRangeCollection';
import { TextRangeCollection } from '../text/definitions';
import { A64Set, Token } from '../tokens/definitions';
import { AstRootImpl } from '../AST/astRoot';
import { FormatOptions, getDiagnosticOptions } from './options';
import { CasingType, detectCasingStyle, detectInstructionSet, detectOperandAlignment } from './detectors';
import { getSetting, Settings } from '../core/settings';

export class EditorDocument {
  private readonly _diagnosticsCollection = languages.createDiagnosticCollection('vscode-arm');
  private readonly _td: TextDocument;

  private _ast: AstRoot | undefined;
  private _instructionSet = A64Set;
  private _formatOptions: FormatOptions;

  constructor(td: TextDocument) {
    this._td = td;
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
  public get formatOptions(): FormatOptions {
    if (!this._formatOptions) {
      // Get some defaults.
      this._formatOptions = getFormatOptions(this._td.getText(), []);
    }
    return this._formatOptions;
  }

  public getAst(): AstRoot | undefined {
    if (!this._ast || this._ast.version < this._td.version) {
      const documentText = this._td.getText();
      let tokens = this.tokenize(documentText);

      let instructionSet = getSetting<string>(Settings.instructionSet, 'auto');
      if (instructionSet === 'auto') {
        instructionSet = detectInstructionSet(documentText, tokens);
      }

      if (this._instructionSet !== instructionSet) {
        this._instructionSet = instructionSet;
        tokens = this.tokenize(documentText);
      }

      this._ast = AstRootImpl.create(this._td.getText(), this._instructionSet, tokens, this._td.version);
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

  public getTokenIndexUnderCaret(): number {
    const offset = this.getCaretOffset();
    return offset ? this.getTokenIndexContainingOffset(offset) : -1;
  }

  public getTokenIndexContainingPosition(position: Position): number {
    const offset = this._td.offsetAt(position);
    return this.getTokenIndexContainingOffset(offset);
  }

  public getTokenIndexContainingOffset(offset: number): number {
    return this._ast?.tokens.getItemContaining(offset) ?? -1;
  }

  public getTokenText(t: Token): string {
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
    const diagOptions = getDiagnosticOptions();
    if (!diagOptions.showDiagnostic) {
      return;
    }

    const diagnostics: Diagnostic[] = [];
    if (this._ast) {
      this._ast.errors
        .filter((e) => e.errorType !== ParseErrorType.UnknownInstruction || diagOptions.unknownInstructions)
        .filter((e) => e.errorType !== ParseErrorType.UnknownDirective || diagOptions.unknownDirectives)
        .forEach((e) => {
          const range = new Range(this._td.positionAt(e.start), this._td.positionAt(e.end));
          const d = new Diagnostic(
            range,
            getParseErrorMessage(e.errorType, this._instructionSet),
            DiagnosticSeverity.Warning
          );
          diagnostics.push(d);
        });
    }

    if (!ct.isCancellationRequested) {
      this._diagnosticsCollection.set(this._td.uri, diagnostics);
    }
  }

  private tokenize(documentText: string): readonly Token[] {
    const t = new Tokenizer(this._instructionSet);
    return t.tokenize(new TextStream(documentText));
  }
}

export function getFormatOptions(documentText: string, tokens: readonly Token[]): FormatOptions {
  // Fetch settings and detect those that are set to 'auto'.
  // If auto-detection fails, use most common defaults.
  const labelsCaseSetting = getSetting<string>(Settings.formattingLabelsCase, 'auto');
  const directivesCaseSetting = getSetting<string>(Settings.formattingDirectivesCase, 'auto');
  const instructionsCaseSetting = getSetting<string>(Settings.formattingInstructionsCase, 'auto');
  const registersCaseSetting = getSetting<string>(Settings.formattingRegistersCase, 'auto');
  const alignOperandsSetting = getSetting<string>(Settings.formattingAlignOperands, 'auto');

  let detectedStyle = detectCasingStyle(documentText, tokens);
  let alignOperands = true;

  let uppercaseLabels = false;
  let uppercaseDirectives = false;
  let uppercaseInstructions = true;
  let uppercaseRegisters = false;

  if (
    labelsCaseSetting === 'auto' &&
    (detectedStyle.labels === CasingType.Upper || detectedStyle.labels === CasingType.Lower)
  ) {
    uppercaseLabels = detectedStyle.labels === CasingType.Upper;
  }
  if (
    directivesCaseSetting === 'auto' &&
    (detectedStyle.directives === CasingType.Upper || detectedStyle.directives === CasingType.Lower)
  ) {
    uppercaseDirectives = detectedStyle.directives === CasingType.Upper;
  }
  if (
    instructionsCaseSetting === 'auto' &&
    (detectedStyle.instructions === CasingType.Upper || detectedStyle.instructions === CasingType.Lower)
  ) {
    uppercaseInstructions = detectedStyle.instructions === CasingType.Upper;
  }
  if (
    registersCaseSetting === 'auto' &&
    (detectedStyle.registers === CasingType.Upper || detectedStyle.registers === CasingType.Lower)
  ) {
    uppercaseRegisters = detectedStyle.registers === CasingType.Upper;
  }

  if (alignOperandsSetting === 'auto') {
    alignOperands = detectOperandAlignment(tokens);
  } else {
    alignOperands = alignOperandsSetting === 'on';
  }

  return {
    tabSize: getSetting<number>('editor.tabSize', 4),
    spaceAfterComma: getSetting<boolean>(Settings.formattingSpaceAfterComma, true),
    spaceAroundOperators: getSetting<boolean>(Settings.formattingSpaceAroundOperators, true),
    uppercaseLabels,
    uppercaseDirectives,
    uppercaseInstructions,
    uppercaseRegisters,
    labelsOnSeparateLines: getSetting<boolean>(Settings.labelsOnSeparateLines, true),
    alignOperands,
    alignEolComments: getSetting<boolean>(Settings.formattingAlignEolComments, true),
  };
}
