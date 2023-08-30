// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextRange } from "./textRange";

/**
 * A collection of text ranges or objects that implement TextRange.
 * Ranges must not overlap and are sorted by range start positions. 
 * Can be searched for a range that contains given position or range 
 * that starts at a given position. The search is a binary search. 
 */
export class TextRangeCollection<T extends TextRange> {
  private _items: T[];

  constructor(items?: T[]) {
    this._items = items ?? [];
  }

  get start(): number {
    return this._items.length > 0 ? this._items[0].start : 0;
  }

  get end(): number {
    const lastItem = this._items[this._items.length - 1];
    return this._items.length > 0 ? lastItem.start + lastItem.length : 0;
  }

  get length(): number {
    return this.end - this.start;
  }

  get count(): number {
    return this._items.length;
  }

  contains(position: number) {
    return position >= this.start && position < this.end;
  }

  getItemAt(index: number): T {
    if (index < 0 || index >= this._items.length) {
      throw new Error("index is out of range");
    }
    return this._items[index];
  }

  /**
   * Finds item that starts at given position.
   * @param position - Position in a text buffer
   * @returns  Returns index of item that starts at the given position if exists, -1 otherwise
   */
  getItemAtPosition(position: number): number {
    if (this.count === 0) {
      return -1;
    }
    if (position < this.start) {
      return -1;
    }
    if (position > this.end) {
      return -1;
    }

    let min = 0;
    let max = this.count - 1;

    while (min < max) {
      const mid = Math.floor(min + (max - min) / 2);
      const item = this._items[mid];

      if (position === item.start) {
          return mid;
      }

      if (position < item.start) {
        max = mid - 1;
      } else {
        min = mid + 1;
      }
    }

    return min;
  }

  /**
   * Returns index of items that contains given position if exists, -1 otherwise.
   * @param position - Position in a text buffer
   * @returns Item index or -1 if not found
   */
  getItemContaining(position: number): number {
    if (this.count === 0) {
      return -1;
    }
    if (position < this.start) {
      return -1;
    }
    if (position > this.end) {
      return -1;
    }

    var min = 0;
    var max = this.count - 1;

    while (min <= max) {
      var mid = Math.floor(min + (max - min) / 2);
      var item = this._items[mid];

      if (TextRange.contains(item.start, item.length, position)) {
        return mid;
      }

      if (mid < this.count - 1 && item.end <= position && position < this._items[mid + 1].start) {
        return -1;
      }

      if (position < item.start) {
        max = mid - 1;
      } else {
        min = mid + 1;
      }
    }

    return -1;
  }
}
