// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Partially based on 
//   https://github.com/microsoft/pyright/blob/main/packages/pyright-internal/src/common/textRange.ts
//   https://github.com/MikhailArkhipov/vscode-r/blob/master/src/Languages/Core/Impl/Text/TextRange.cs
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextProvider } from "./text";

/**
 *    Represents range of text in a text source.
 */
export interface TextRange {
  readonly start: number;
  readonly length: number;
  readonly end: number;
}

export namespace TextRange {
  export function emptyRange(): TextRange {
    return new TextRangeImpl(0,0);
  }

  export function create(start: number, length: number): TextRange {
    return new TextRangeImpl(start, length);
  }

  export function fromBounds(start: number, end: number): TextRange {
    return new TextRangeImpl(start, end - start);
  }

  export function contains(start: number, length: number, position: number): boolean {
    if (length === 0 && position === start) {
      return true;
    }
    return position >= start && position < start + length;
  }

  export function containsRange(start1: number, length1: number, start2: number, length2: number): boolean {
   return contains(start1, length1, start2) && contains(start1, length1, start2+length2)
  }

  export function intersect(start1: number, length1: number, start2: number, length2: number): boolean {
    if (length1 === 0 && length2 === 0) {
      return start1 === start2;
    }
    if (length1 == 0) {
      return contains(start2, length2, start1);
    }
    if (length2 == 0) {
      return contains(start1, length1, start2);
    }

    return start2 + length2 > start1 && start2 < start1 + length1;
  }

  export function intersectRange(range1: TextRange, range2: TextRange): boolean {
    return intersect(range1.start, range1.length, range2.start, range2.length);
  }

  export function isValid(range: TextRange): boolean {
    return range && range.length > 0;
  }

  export function union(start1: number, length1: number, start2: number, length2: number): TextRange {
    const start = Math.min(start1, start2);
    const end = Math.max(start1 + length1, start2 + length2);
    return start <= end ? fromBounds(start, end) : emptyRange();
  }

  export function unionRange(range1: TextRange, range2: TextRange): TextRange {
    return TextRange.union(range1.start, range1.length, range2.start, range2.end);
  }

  export function intersection(start1: number, length1: number, start2: number, length2: number): TextRange {
    const start = Math.max(start1, start2);
    const end = Math.min(start1 + length1, start2 + length2);
    return start <= end ? fromBounds(start, end) : emptyRange();
  }

  export function intersectionRange(range1: TextRange, range2: TextRange): TextRange {
    return intersection(range1.start, range1.length, range2.start, range2.length);
  }

  export function getText(tp: TextProvider, range: TextRange): string {
    return tp.getText(range.start, range.length);
  }
}

export class TextRangeImpl implements TextRange {
  public readonly start: number;
  public readonly length: number;

  constructor(start?: number, length?: number) {
    this.start = start ?? 0;
    this.length = length ?? 0;
  }

  get end(): number {
    return this.start + this.length;
  }
}
