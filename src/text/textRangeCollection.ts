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

  public get start(): number {
    return this._items.length > 0 ? this._items[0].start : 0;
  }

  public get end(): number {
    const lastItem = this._items[this._items.length - 1];
    return this._items.length > 0 ? lastItem.start + lastItem.length : 0;
  }

  public get length(): number {
    return this.end - this.start;
  }

  public get count(): number {
    return this._items.length;
  }

  public get asArray(): readonly T[] {
    return this._items;
  }

  public contains(position: number) {
    return position >= this.start && position < this.end;
  }

  public getItemAt(index: number): T {
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
  public getItemAtPosition(position: number): number {
    if (this.count === 0) {
      return -1;
    }
    if (position < this.start) {
      return -1;
    }
    if (position >= this.end) {
      return -1;
    }

    let min = 0;
    let max = this.count - 1;

    while (min <= max) {
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

    return -1;
  }

  /**
   * Returns index of items that contains given position if exists, -1 otherwise.
   * @param position - Position in a text buffer
   * @returns Item index or -1 if not found
   */
  public getItemContaining(position: number): number {
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

    while (min <= max) {
      const mid = Math.floor(min + (max - min) / 2);
      const item = this._items[mid];

      if (item.contains(position)) {
        return mid;
      }

      if (
        mid < this.count - 1 &&
        item.end <= position &&
        position < this._items[mid + 1].start
      ) {
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

  public getFirstItemBeforePosition(position: number): number {
    if (this.count === 0 || position < this.getItemAt(0).end) {
      return -1;
    }

    const lastIndex = this.count - 1;
    let min = 0;
    let max = this.count - 1;

    if (position >= this._items[lastIndex].end) {
      return max;
    }

    while (min <= max) {
      const mid = Math.floor(min + (max - min) / 2);
      const item = this._items[mid];

      if (item.contains(position)) {
        return mid - 1;
      }

      if (
        mid < lastIndex &&
        this._items[mid + 1].start >= position &&
        item.end <= position
      ) {
        return mid;
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
