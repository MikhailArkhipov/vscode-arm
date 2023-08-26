// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

namespace Text {
    /**
     * Represents a range in a text buffer or a string. Specified start and end of text. 
     * End is exclusive, i.e. Length = End - Start. Implements IComparable that compares
     * range start positions. 
     */
    export class TextRange implements ITextRange {
        private _start: number;
        private _length: number;

        constructor(start?: number, length?: number) {
            this._start = start ?? 0;
            this._length = length ?? 0;
        }

        get start(): number {
            return this._start;
        }

        get end(): number {
            return this._start + this._length;
        }

        get length(): number {
            return this._length;
        }

        public shift(offset: number): void {
            this._start += offset;
         }

        public contains(position: number): boolean {
            return TextRange.Contains(this.start, this.length, position);
        }

        public intersect(start: number, length: number): boolean {
            return TextRange.Intersect(this.start, this.length, start, length);
        }

        public intersectRange(range: ITextRange): boolean {
            return TextRange.IntersectRange(this, range);
        }

        public union(start: number, length: number): ITextRange {
            return TextRange.Union(this.start, this.length, start, length);
        }

        public unionRange(range: ITextRange): ITextRange {
            return TextRange.UnionRange(this, range);
        }

        public intersection(start: number, length: number): ITextRange {
            return TextRange.Intersection(this.start, this.length, start, length);
        }

        public intersectionRange(range: ITextRange): ITextRange {
            return TextRange.IntersectionRange(this, range);
        }

        public isValid(): boolean {
            return TextRange.IsValid(this);
        }

        public static readonly EmptyRange: TextRange = new TextRange(0, 0);

        public static FromBounds(start: number, end: number): TextRange {
            return new TextRange(start, end - start);
        }

        public static Contains(start: number, length: number, position: number): boolean {
            if (length === 0 && position === start) {
                return true;
            }
            return position >= start && position < start + length;
        }

        public static Intersect(start1: number, length1: number, start2: number, length2: number): boolean {
            if (length1 === 0 && length2 === 0) {
                return start1 === start2;
            }
            if (length1 == 0) {
                return TextRange.Contains(start2, length2, start1);
            }
            if (length2 == 0) {
                return TextRange.Contains(start1, length1, start2);
            }

            return start2 + length2 > start1 && start2 < start1 + length1;
        }

        public static IntersectRange(range1: ITextRange, range2: ITextRange): boolean {
            return TextRange.Intersect(range1.start, range1.length, range2.start, range2.length);
        }

        public static IsValid(range: ITextRange): boolean {
            return range != null && range.length > 0;
        }

        public static Union(start1: number, length1: number, start2: number, length2: number): ITextRange {
            var start = Math.min(start1, start2);
            var end = Math.max(start1 + length1, start2 + length2);
            return start <= end ? TextRange.FromBounds(start, end) : TextRange.EmptyRange;
        }

        public static UnionRange(range1: ITextRange, range2: ITextRange): ITextRange {
            return TextRange.Union(range1.start, range1.length, range2.start, range2.end);
        }

        public static Intersection(start1: number, length1: number, start2: number, length2: number): ITextRange {
            var start = Math.max(start1, start2);
            var end = Math.min(start1 + length1, start2 + length2);
            return start <= end ? TextRange.FromBounds(start, end) : TextRange.EmptyRange;
        }

        public static IntersectionRange(range1: ITextRange, range2: ITextRange): ITextRange {
            return TextRange.Intersection(range1.start, range1.length, range2.start, range2.length);
        }
    }
}