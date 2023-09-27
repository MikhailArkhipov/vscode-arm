// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextRangeCollection } from './definitions';
import { TextRange } from './textRange';

/**
 * A collection of text ranges or objects that implement TextRange.
 * Ranges must not overlap and are sorted by range start positions.
 * Can be searched for a range that contains given position or range
 * that starts at a given position. The search is a binary search.
 */

export abstract class BaseTextRangeCollectionImpl<T extends TextRange> implements TextRangeCollection<T> {
  protected abstract items(): readonly T[];

  // TextRange
  public get start(): number {
    return this.items().length > 0 ? this.items()[0].start : 0;
  }

  public get end(): number {
    const lastItem = this.items().length > 0 ? this.items()[this.items().length - 1] : undefined;
    return lastItem ? lastItem.end : 0;
  }

  public get length(): number {
    return this.end - this.start;
  }

  public get count(): number {
    return this.items().length;
  }

  public asArray(): readonly T[] {
    return this.items();
  }

  public contains(position: number) {
    return TextRange.contains(this.start, this.length, position);
  }

  public containsRange(range: TextRange) {
    return TextRange.containsRange(this, range);
  }

  // TextRangeCollection<T>
  public getItemAt(index: number): T {
    if (index < 0 || index >= this.items().length) {
      throw new Error('index is out of range');
    }
    return this.items()[index];
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
      const item = this.items()[mid];

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
      const item = this.items()[mid];

      if (item.contains(position)) {
        return mid;
      }

      if (mid < this.count - 1 && item.end <= position && position < this.items()[mid + 1].start) {
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

    if (position >= this.items()[lastIndex].end) {
      return max;
    }

    while (min <= max) {
      const mid = Math.floor(min + (max - min) / 2);
      const item = this.items()[mid];

      if (item.contains(position)) {
        return mid - 1;
      }

      if (mid < lastIndex && this.items()[mid + 1].start >= position && item.end <= position) {
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

  private getFirstElementContainingPosition(index: number, position: number): number {
    for (let i = index - 1; i >= 0; i--) {
      const item = this.items()[i];
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

// Read-only collection
export class TextRangeCollectionImpl<T extends TextRange> extends BaseTextRangeCollectionImpl<T> {
  private readonly _items: readonly T[] = [];

  constructor(items?: readonly T[]) {
    super();
    this._items = items ?? [];
  }

  protected items(): readonly T[] {
    return this._items;
  }
}
