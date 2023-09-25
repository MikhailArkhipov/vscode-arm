// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseItem, ParseContext } from "../parser/parseContext";
import { TextRangeImpl, TextRange } from "../text/textRange";
import { TextRangeCollection } from "../text/textRangeCollection";
import { AstNode } from "./definitions";

export class AstNodeImpl extends TextRangeImpl implements AstNode, ParseItem {
  protected _parent: AstNode | undefined;
  private readonly _children: AstNode[] = [];

  public get parent(): AstNode | undefined {
    return this._parent;
  }

  public set parent(value: AstNode | undefined) {
    if (this._parent === value) {
      return;
    }
    if (this._parent && value && this._parent !== value) {
      throw new Error('Node already has parent');
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
    if (!node.parent) {
      node.parent = this;
    } else {
      this._children.push(node);
    }
  }

  public parse(context: ParseContext, parent?: AstNode): boolean {
    // Use property so item gets added to the parent collection.
    this.parent = parent;
    return true;
  }
  // Finds deepest node that contains given position
  public nodeFromPosition(position: number): AstNode | undefined {
    if (!TextRange.contains(this.start, this.length, position)) {
      return; // not this element
    }

    for (let i = 0; i < this.children.count; i++) {
      const child = this.children.getItemAt(i);
      if (child.start > position) {
        break;
      }
      if (child.contains(position)) {
        return child.nodeFromPosition(position);
      }
    }
    return this;
  }

  // Finds deepest node that fully encloses given range
  public nodeFromRange(range: TextRange, inclusiveEnd = false): AstNode | undefined {
    let node: AstNode | undefined;
    if (TextRange.containsRange(this, range, inclusiveEnd)) {
      node = this;
      for (let i = 0; i < this.children.count; i++) {
        const child = this.children[i];
        if (range.end < child.start) {
          break;
        }
        if (TextRange.containsRange(child, range, inclusiveEnd)) {
          node = child.Children.Count > 0 ? child.NodeFromRange(range, inclusiveEnd) : child;
          break;
        }
      }
    }
    return node;
  }
}
