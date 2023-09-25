// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextRange } from "../../text/textRange";

test("TextRange union", () => {
  const range1 = TextRange.create(10, 2);
  const range2 = TextRange.create(12, 2);

  const combined = TextRange.union(range1.start, range1.length, range2.start, range2.length);

  expect(combined).toBeDefined();
  expect(combined.start).toBe(10);
  expect(combined.length).toBe(4);

  // Ensure input ranges are unchanged
  expect(range1.start).toBe(10);
  expect(range1.length).toBe(2);
  expect(range2.start).toBe(12);
  expect(range2.length).toBe(2);
});

test("TextRange intersectRange 1", () => {
  const r1 = TextRange.fromBounds(1, 5);
  const r2 = TextRange.fromBounds(5, 10);

  expect(TextRange.intersectRange(r1, r2)).toBe(false);
  expect(TextRange.intersectRange(r2, r1)).toBe(false);

  expect(TextRange.intersectRange(r1, r1)).toBe(true);

  const r3 = TextRange.fromBounds(1, 1);
  const r4 = TextRange.fromBounds(1, 2);
  const r5 = TextRange.fromBounds(2, 3);

  expect(TextRange.intersectRange(r1, r3)).toBe(true);

  expect(TextRange.intersectRange(r1, r4)).toBe(true);
  expect(TextRange.intersectRange(r1, r5)).toBe(true);

  expect(TextRange.intersectRange(r3, r1)).toBe(true);
  expect(TextRange.intersectRange(r4, r1)).toBe(true);
  expect(TextRange.intersectRange(r5, r1)).toBe(true);

  const r6 = TextRange.fromBounds(Number.MIN_VALUE / 2, Number.MAX_VALUE / 2);
  expect(TextRange.intersectRange(r1, r6)).toBe(true);
  expect(TextRange.intersectRange(r6, r1)).toBe(true);

  const r7 = TextRange.fromBounds(0, 20);
  expect(TextRange.intersectRange(r1, r7)).toBe(true);
  expect(TextRange.intersectRange(r7, r1)).toBe(true);

  const r8 = TextRange.fromBounds(5, 8);
  expect(TextRange.intersectRange(r1, r8)).toBe(false);
  expect(TextRange.intersectRange(r8, r1)).toBe(false);
});

test("TextRange intersectRange 2", () => {
  const r1 = TextRange.fromBounds(1, 5);
  const r2 = TextRange.fromBounds(5, 10);

  expect(TextRange.intersectRange(r1, r2)).toBe(false);
  expect(TextRange.intersectRange(r2, r1)).toBe(false);

  expect(TextRange.intersectRange(r1, r1)).toBe(true);

  const r3 = TextRange.fromBounds(1, 1);
  const r4 = TextRange.fromBounds(1, 2);
  const r5 = TextRange.fromBounds(2, 3);

  expect(TextRange.intersectRange(r1, r3)).toBe(true);

  expect(TextRange.intersectRange(r1, r4)).toBe(true);
  expect(TextRange.intersectRange(r1, r5)).toBe(true);

  expect(TextRange.intersectRange(r3, r1)).toBe(true);
  expect(TextRange.intersectRange(r4, r1)).toBe(true);
  expect(TextRange.intersectRange(r5, r1)).toBe(true);

  const r6 = TextRange.fromBounds(Number.MIN_VALUE / 2, Number.MAX_VALUE / 2);
  expect(TextRange.intersectRange(r1, r6)).toBe(true);
  expect(TextRange.intersectRange(r6, r1)).toBe(true);

  const r7 = TextRange.fromBounds(0, 20);
  expect(TextRange.intersectRange(r1, r7)).toBe(true);
  expect(TextRange.intersectRange(r7, r1)).toBe(true);

  const r8 = TextRange.fromBounds(5, 8);
  expect(TextRange.intersectRange(r1, r8)).toBe(false);
  expect(TextRange.intersectRange(r8, r1)).toBe(false);
});

test("TextRange isValid", () => {
  expect(TextRange.isValid(TextRange.emptyRange())).toBe(false);

  const r1 = TextRange.fromBounds(1, 1);
  expect(TextRange.isValid(r1)).toBe(false);

  const r2 = TextRange.fromBounds(1, 2);
  expect(TextRange.isValid(r2)).toBe(true);

  const r4 = TextRange.fromBounds(2, 3);
  expect(TextRange.isValid(r4)).toBe(true);
});

test("TextRange construction", () => {
  let r = TextRange.fromBounds(0, 1);
  expect(r.start).toBe(0);
  expect(r.length).toBe(1);
  expect(r.end).toBe(1);

  r = TextRange.create(1, 2);
  expect(r.start).toBe(1);
  expect(r.length).toBe(2);
  expect(r.end).toBe(3);

  r = TextRange.create(Number.MAX_VALUE, 0);
  expect(r.start).toBe(Number.MAX_VALUE);
  expect(r.length).toBe(0);
  expect(r.end).toBe(Number.MAX_VALUE);
});

test("TextRange contains 1", () => {
  const r = TextRange.fromBounds(1, 3);

  expect(r.contains(Number.MIN_VALUE)).toBe(false);
  expect(r.contains(0)).toBe(false);

  expect(r.contains(1)).toBe(true);
  expect(r.contains(2)).toBe(true);

  expect(r.contains(3)).toBe(false);
  expect(r.contains(Number.MAX_VALUE)).toBe(false);
});

test("TextRange contains 2", () => {
  const r1 = TextRange.fromBounds(1, 5);

  let r2 = TextRange.fromBounds(Number.MIN_VALUE / 2, 0);
  expect(r1.containsRange(r2)).toBe(false);
  r2 = TextRange.fromBounds(0, 1);
  expect(r1.containsRange(r2)).toBe(false);

  r2 = TextRange.fromBounds(5, 6);
  expect(r1.containsRange(r2)).toBe(false);
  r2 = TextRange.fromBounds(5, Number.MAX_VALUE / 2);
  expect(r1.containsRange(r2)).toBe(false);

  r2 = TextRange.fromBounds(1, 2);
  expect(r1.containsRange(r2)).toBe(true);
  r2 = TextRange.fromBounds(3, 4);
  expect(r1.containsRange(r2)).toBe(true);

  r2 = TextRange.fromBounds(1, 5);
  expect(r1.containsRange(r2)).toBe(false);
});

test("TextRange empty", () => {
  const r = TextRange.emptyRange();

  expect(TextRange.isValid(r)).toBe(false);
  expect(r.start).toBe(0);
  expect(r.end).toBe(0);
  expect(r.length).toBe(0);
});
