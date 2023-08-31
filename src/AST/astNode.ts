// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextRange } from "../text/textRange";
import { TextRangeCollection } from "../text/textRangeCollection";
import { ParseContext } from "../parser/parseContext";

export interface AstNode extends TextRange {
  readonly parent?: AstNode;
  readonly children: TextRangeCollection<AstNode>;

  appendChild(node: AstNode): void;
  parse(context: ParseContext, parent?: AstNode): boolean;

  // Finds deepest node that contains given position
  //nodeFromPosition(position: number): AstNode;
  // Finds deepest element node that fully encloses given range
  //nodeFromRange(range: TextRange): AstNode;
}

export namespace AstNode {
  export function getRoot(node: AstNode | undefined): AstNode | undefined {
    if (!node) {
      return;
    }
    while (node && node.parent !== node) {
      node = node.parent;
    }
    return node;
  }
}

export interface ParseItem {}

export class AstNodeImpl implements AstNode, ParseItem {
  private _parent?: AstNode;
  private readonly _children: AstNode[] = [];

  public get parent(): AstNode | undefined {
    return this._parent;
  }
  public set parent(value: AstNode | undefined) {
    if (this._parent && this._parent !== value && value !== null) {
      throw new Error("Node already has parent");
    }
    this._parent = value;
    if (this._parent) {
      this._parent.appendChild(this);
    }
  }

  public get children(): TextRangeCollection<AstNode> {
    return new TextRangeCollection(this._children);
  }

  public get start(): number {
    return this._children.length > 0 ? this._children[0].start : 0;
  }

  public get length(): number {
    return this.end - this.start;
  }

  public get end(): number {
    return this._children.length > 0 ? this._children[this._children.length - 1].end : 0;
  }

  public appendChild(node: AstNode): void {
    this._children.push(node);
  }

  public parse(context: ParseContext, parent?: AstNode): boolean {
    this._parent = parent;
    return true;
  }
}
