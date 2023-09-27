// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License.

import { TextRange } from './textRange';

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