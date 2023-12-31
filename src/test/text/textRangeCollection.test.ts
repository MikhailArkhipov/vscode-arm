// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextRange, TextRangeCollection } from '../../text/definitions';
import { TextRangeCollectionImpl } from '../../text/textRangeCollection';

function makeCollection(): TextRangeCollection<TextRange> {
  const ranges: TextRange[] = [];
  ranges.push(TextRange.fromBounds(1, 2));
  ranges.push(TextRange.fromBounds(3, 5));
  ranges.push(TextRange.fromBounds(5, 7));
  return new TextRangeCollectionImpl<TextRange>(ranges);
}

test('TextRangeCollection construction 1', () => {
  const target = new TextRangeCollectionImpl<TextRange>();
  expect(target.count).toBe(0);
  expect(target.start).toBe(0);
  expect(target.end).toBe(0);
  expect(target.length).toBe(0);
});

test('TextRangeCollection construction 2', () => {
  const target = makeCollection();

  expect(target.count).toBe(3);
  expect(target.start).toBe(1);
  expect(target.end).toBe(7);
  expect(target.length).toBe(6);

  expect(target.getItemAt(0).start).toBe(1);
  expect(target.getItemAt(1).start).toBe(3);
  expect(target.getItemAt(2).start).toBe(5);
});

test('TextRangeCollection contans', () => {
  const target = makeCollection();

  expect(target.contains(1)).toBe(true);
  expect(target.contains(2)).toBe(true);
  expect(target.contains(3)).toBe(true);
  expect(target.contains(4)).toBe(true);
  expect(target.contains(5)).toBe(true);
  expect(target.contains(6)).toBe(true);

  expect(target.contains(-10)).toBe(false);
  expect(target.contains(0)).toBe(false);
  expect(target.contains(7)).toBe(false);
  expect(target.contains(Number.MAX_VALUE)).toBe(false);
});

test('TextRangeCollection getItemAtPosition', () => {
  const target = makeCollection();

  expect(target.getItemAtPosition(0)).toBe(-1);
  expect(target.getItemAtPosition(-2)).toBe(-1);

  expect(target.getItemAtPosition(1)).toBe(0);
  expect(target.getItemAtPosition(2)).toBe(-1);

  expect(target.getItemAtPosition(3)).toBe(1);
  expect(target.getItemAtPosition(4)).toBe(-1);
  expect(target.getItemAtPosition(5)).toBe(2);

  expect(target.getItemAtPosition(10)).toBe(-1);
  expect(target.getItemAtPosition(Number.MAX_VALUE)).toBe(-1);
});

test('TextRangeCollection getItemContaining', () => {
  const target = makeCollection();

  expect(target.getItemContaining(0)).toBe(-1);
  expect(target.getItemContaining(-2)).toBe(-1);

  expect(target.getItemContaining(1)).toBe(0);
  expect(target.getItemContaining(2)).toBe(-1);

  expect(target.getItemContaining(3)).toBe(1);
  expect(target.getItemContaining(4)).toBe(1);
  expect(target.getItemContaining(5)).toBe(2);
  expect(target.getItemContaining(6)).toBe(2);
  expect(target.getItemContaining(7)).toBe(-1);

  expect(target.getItemContaining(10)).toBe(-1);
  expect(target.getItemContaining(Number.MAX_VALUE)).toBe(-1);
});
