// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License.

/**
 *    Represents range of text in a text source.
 */
export interface TextRange {
  readonly start: number;
  readonly length: number;
  readonly end: number;

  // Containment
  contains(position: number): boolean;
  containsRange(other: TextRange, inclusiveEnd?: boolean): boolean;
}

export class TextRangeImpl implements TextRange {
  private readonly _start: number;
  private readonly _length: number;

  constructor(start?: number, length?: number) {
    this._start = start ?? 0;
    this._length = length ?? 0;
  }

  get start(): number {
    return this._start;
  }
  get length(): number {
    return this._length;
  }
  get end(): number {
    return this._start + this._length;
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
}

export namespace TextRange {
  export function emptyRange(): TextRange {
    return new TextRangeImpl(0, 0);
  }

  export function create(start: number, length: number): TextRange {
    return new TextRangeImpl(start, length);
  }
  export function fromBounds(start: number, end: number): TextRange {
    return new TextRangeImpl(start, end - start);
  }
  export function isValid(range: TextRange): boolean {
    return range && range.length > 0;
  }

  // Containment
  export function contains(start: number, length: number, position: number): boolean {
    if (length === 0 && position === start) {
      return true;
    }
    return position >= start && position < start + length;
  }

  export function containsRange(range: TextRange, other: TextRange, inclusiveEnd = false): boolean {
    if (inclusiveEnd) {
      return TextRange.containsInclusiveEnd(range, other);
    }
    return range.contains(other.start) && range.contains(other.end);
  }

  // Determines if range contains another range or it contains start point
  export function containsInclusiveEnd(range: TextRange, other: TextRange): boolean {
    return range.contains(other.start) && (range.contains(other.end) || range.end === other.end);
  }

  // Intersection
  export function intersect(start1: number, length1: number, start2: number, length2: number): boolean {
    if (length1 === 0 && length2 === 0) {
      return start1 === start2;
    }
    if (length1 === 0) {
      return contains(start2, length2, start1);
    }
    if (length2 === 0) {
      return contains(start1, length1, start2);
    }

    return start2 + length2 > start1 && start2 < start1 + length1;
  }

  export function intersectRange(range1: TextRange, range2: TextRange): boolean {
    return intersect(range1.start, range1.length, range2.start, range2.length);
  }

  // Combination
  export function union(start1: number, length1: number, start2: number, length2: number): TextRange {
    const start = Math.min(start1, start2);
    const end = Math.max(start1 + length1, start2 + length2);
    return start <= end ? fromBounds(start, end) : emptyRange();
  }

  export function unionRange(range1: TextRange, range2: TextRange): TextRange {
    return TextRange.union(range1.start, range1.length, range2.start, range2.end);
  }

  // Intersection
  export function intersection(start1: number, length1: number, start2: number, length2: number): TextRange {
    const start = Math.max(start1, start2);
    const end = Math.min(start1 + length1, start2 + length2);
    return start <= end ? fromBounds(start, end) : emptyRange();
  }

  export function intersectionRange(range1: TextRange, range2: TextRange): TextRange {
    return intersection(range1.start, range1.length, range2.start, range2.length);
  }
}

/**
 * A collection of text ranges or objects that implement TextRange.
 * Ranges must not overlap and are sorted by range start positions.
 * Can be searched for a range that contains given position or range
 * that starts at a given position. The search is a binary search.
 */

export interface TextRangeCollection<T extends TextRange> extends TextRange {
  get count(): number;
  asArray(): readonly T[];

  getItemAt(index: number): T;
  /**
   * Finds item that starts at given position.
   * @param position - Position in a text buffer
   * @returns  Returns index of item that starts at the given position if exists, -1 otherwise
   */
  getItemAtPosition(position: number): number;
  /**
   * Returns index of items that contains given position if exists, -1 otherwise.
   * @param position - Position in a text buffer
   * @returns Item index or -1 if not found
   */
  getItemContaining(position: number): number;
  /**
   * Retrieves first item that is before the given position.
   * @param position - Position in a text buffer
   * @returns Item index or -1 if not found
   */
  getFirstItemBeforePosition(position: number): number;

  /**
   * Retrieves first item that is at or after the given position.
   * @param position - Position in a text buffer
   * @returns Item index or -1 if not found
   */
  getFirstItemAfterOrAtPosition(position: number) 
}

// Abstracts character iteraction over text source.
export interface TextIterator {
  readonly length: number;
  charAt(position: number): string;
  charCodeAt(position: number): number;
}

// Abstract text provider.
export interface TextProvider extends TextIterator {
  getText(): string;
  getText(start: number, length: number): string;
  indexOf(text: string, startPosition: number, ignoreCase: boolean): number;
  compareTo(position: number, length: number, text: string, ignoreCase: boolean): boolean;
}
