// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { AstNode, AstRoot } from '../../AST/definitions';
import { getParseErrorMessage } from '../../editor/messages';
import { makeWhitespace } from '../../text/utility';

export function writeAstTokens(ast: AstRoot, text: string): string {
  const chunks: string[] = [];
  ast.tokens.asArray().forEach((t) => {
    chunks.push(`${text.substring(t.start, t.end)} ${t.type}:${t.subType} [${t.start}...${t.end})`);
  });
  return chunks.join(' ');
}

export class AstWriter {
  private _chunks: string[] = [];
  private _indent: number;

  public writeAst(ast: AstRoot): string {
    this.writeChunks(ast);

    if (ast.errors.length > 0) {
      this._chunks.push('\n');
      ast.errors.forEach((e) => {
        this._chunks.push(
          `Error: ${getParseErrorMessage(e.errorType, ast.instructionSet)}, range [${e.start}...${e.end})`
        );
      });
    }
    const tree = this._chunks.join('');
    return '\n' + tree; // Add line break to make specifying of expected tree easier with String.raw.
  }

  public writeTree(node: AstNode): string {
    this.writeChunks(node);
    const tree = this._chunks.join('');
    return '\n' + tree; // Add line break to make specifying of expected tree easier with String.raw.
  }

  private writeChunks(node: AstNode): void {
    this._chunks = [];
    this._indent = 0;
   
    node.children.asArray().forEach((e) => {
      this.writeNode(e);
    });
  }

  private writeNode(node: AstNode): void {
    this.indent();
    this._chunks.push(node.toString());
    this._chunks.push('\n');
    this._indent++;

    node.children.asArray().forEach((e) => {
      this.writeNode(e);
    });
    this._indent--;
  }

  private indent(): void {
    this._chunks.push(makeWhitespace(this._indent * 2));
  }
}
