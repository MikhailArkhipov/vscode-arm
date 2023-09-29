// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { AstNode, AstRoot } from '../../AST/definitions';
import { getParseErrorMessage } from '../../editor/messages';
import { makeWhitespace } from '../../text/utility';

export class AstWriter {
  private _chunks: string[] = [];
  private _indent: number;
  private _text: string;

  public writeAst(ast: AstRoot, text: string): string {
    this.writeChunks(ast, text);
    
    if(ast.errors.length > 0) {
      this._chunks.push('\n');
      ast.errors.forEach(e => {
        this._chunks.push(`Error: ${getParseErrorMessage(e.errorType)}, range [${e.start}...${e.end})`);
      });
    }
    return this._chunks.join('');
  }

  public writeTree(node: AstNode, text: string): string {
    this.writeChunks(node, text);
    return this._chunks.join('');
  }

  private writeChunks(node: AstNode, text: string): void {
    this._chunks = [];
    this._indent = 0;
    this._text = text;

    node.children.asArray().forEach((e) => {
      this.writeNode(e);
    });
  }

  private writeNode(node: AstNode): void {
    this.indent();

    let type = node.constructor.name;
    if (type.endsWith('Impl')) {
      type = type.substring(0, type.length - 4);
    }

    switch (type) {
      case 'TokenOperator':
        type = `Operator ${this._text.substring(node.start, node.end)}`;
        break;
      case 'TokenNode':
        type = `Token ${this._text.substring(node.start, node.end)}`;
        break;
    }

    this._chunks.push(type);
    this._chunks.push(` [${node.start}...${node.end})\n`);

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
