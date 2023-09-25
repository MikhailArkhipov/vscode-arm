// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Partially based on
//   https://github.com/microsoft/pyright/blob/main/packages/pyright-internal/src/common/textRange.ts
//   https://github.com/MikhailArkhipov/vscode-r/blob/master/src/Languages/Core/Impl/Text/TextRange.cs
// Licensed under the MIT License. See LICENSE in the project root for license information.

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
