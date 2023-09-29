// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { AstNode, TokenNode, TokenOperator } from '../../AST/definitions';
import { makeWhitespace } from '../../text/utility';

export class AstWriter {
  private _chunks: string[] = [];
  private _indent: number;
  private _text: string;

  public writeTree(node: AstNode, text: string): string {
    this._chunks = [];
    this._indent = 0;
    this._text = text;

    node.children.asArray().forEach((e) => {
      this.writeNode(e);
    });

    return this._chunks.join('');
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
