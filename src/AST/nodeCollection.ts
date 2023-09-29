// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { BaseTextRangeCollectionImpl } from '../text/textRangeCollection';
import { AstNode, NodeCollection } from './definitions';

// Volatile collection since children can be added during parse pass.
export class NodeCollectionImpl extends BaseTextRangeCollectionImpl<AstNode> implements NodeCollection {
  private readonly _items: AstNode[] = [];

  protected items(): readonly AstNode[] {
    return this._items;
  }

  public addSorted(item: AstNode): void {
    // Insert sorted! Small optimizations.
    if (this._items.length === 0) {
      this._items.push(item);
      return;
    }
    // Collection should be sorted at this point so just check the last item.
    const lastChild = this._items[this._items.length - 1];
    if (lastChild.end <= item.start) {
      this._items.push(item);
      return;
    }
    // Insertions somewhere not at the end.
    const nextItemIndex = this.getFirstItemAfterOrAtPosition(item.end);
    if (nextItemIndex < 0) {
      throw new Error('Unable to find position to insert next item into the range collection.');
    } else {
      this._items.splice(nextItemIndex, 0, item);
    }
  }
}
