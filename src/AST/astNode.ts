// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ParseContext } from '../parser/parseContext';
import { TextRange } from '../text/definitions';
import { AstNode, NodeCollection } from './definitions';
import { NodeCollectionImpl } from './nodeCollection';

export class AstNodeImpl implements AstNode {
  // REMOVE IN PRODUCTION, DEBUG ONLY HELPER
  // __text__: string;

  protected _parent: AstNode | undefined;
  private readonly _children = new NodeCollectionImpl();

  // AstNode
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

  public get children(): NodeCollection {
    return this._children;
  }

  // TextRange
  public get start(): number {
    return this._children.count > 0 ? this._children.getItemAt(0).start : 0;
  }
  public get length(): number {
    return this.end - this.start;
  }
  public get end(): number {
    return this._children.count > 0 ? this._children.getItemAt(this._children.count - 1).end : 0;
  }

  public contains(position: number): boolean {
    return TextRange.contains(this.start, this.length, position);
  }

  public containsRange(other: TextRange, inclusiveEnd?: boolean): boolean {
    if (inclusiveEnd) {
      return TextRange.containsInclusiveEnd(this, other);
    }
    return this.contains(other.start) && this.contains(other.end);
  }

  public appendChild(node: AstNode): void {
    if (!node.parent) {
      node.parent = this;
    } else {
      this._children.addSorted(node);
    }
  }

  // ParseItem
  public parse(context: ParseContext, parent?: AstNode): boolean {
    // Use property so item gets added to the parent collection.
    this.parent = parent;
    // REMOVE IN PRODUCTION, DEBUG ONLY HELPER
    // this.__text__ = `${context.text.getText(this.start, this.length)} [${this.start}...${this.end})`;
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
        const child = this.children.getItemAt(i);
        if (range.end < child.start) {
          break;
        }
        if (TextRange.containsRange(child, range, inclusiveEnd)) {
          node = child.children.count > 0 ? child.nodeFromRange(range, inclusiveEnd) : child;
          break;
        }
      }
    }
    return node;
  }

  public toString(): string {
    return `Node: [${this.start}...${this.end})`;
  };
}
