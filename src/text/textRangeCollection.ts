// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextRange } from './textRange';

/**
 * A collection of text ranges or objects that implement TextRange.
 * Ranges must not overlap and are sorted by range start positions.
 * Can be searched for a range that contains given position or range
 * that starts at a given position. The search is a binary search.
 */
export class TextRangeCollection<T extends TextRange> {
  private _items: T[] = [];

  constructor(items?: T[]) {
    this._items = items ?? [];
  }

  public get start(): number {
    return this._items.length > 0 ? this._items[0].start : 0;
  }

  public get end(): number {
    const lastItem = this._items.length > 0 ? this._items[this._items.length - 1] : undefined;
    return lastItem ? lastItem.end : 0;
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
      throw new Error('index is out of range');
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

      if (mid < lastIndex && this._items[mid + 1].start >= position && item.end <= position) {
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

  // Retrieves first item that is after a given position
  public getFirstItemAfterOrAtPosition(position: number) {
    if (this.count === 0 || position > this.getItemAt(this.count - 1).end) {
      return -1;
    }
    if (position < this.getItemAt(0).start) {
      return 0;
    }

    let min = 0;
    let max = this.count - 1;

    while (min <= max) {
      const mid = Math.floor(min + (max - min) / 2);
      const item = this.getItemAt(mid);

      if (item.contains(position)) {
        // Note that there may be multiple items with the same range.
        // To be sure we do pick the first one, walk back until we include
        // all elements containing passed position
        return this.getFirstElementContainingPosition(mid, position);
      }

      if (mid > 0 && this.getItemAt(mid - 1).end <= position && item.start >= position) {
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

  public addSorted(item: T): void {
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

  private getFirstElementContainingPosition(index: number, position: number): number {
    for (let i = index - 1; i >= 0; i--) {
      const item = this._items[i];
      if (!item.contains(position)) {
        index = i + 1;
        break;
      } else if (i === 0) {
        return 0;
      }
    }
    return index;
  }
}
