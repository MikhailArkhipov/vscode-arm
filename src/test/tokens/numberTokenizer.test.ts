// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TestUtil } from "../utility";


test('Empty string', () => {
  const length = TestUtil.tokenizeNumber('');
  expect(length).toBe(0);
});

test('Decimal', () => {
  const s = '1 12 123456, 3+4';
  let length = TestUtil.tokenizeNumber(s, 0);
  expect(length).toBe(1);
  length = TestUtil.tokenizeNumber(s, 2);
  expect(length).toBe(2);
  length = TestUtil.tokenizeNumber(s, 5);
  expect(length).toBe(6);
  length = TestUtil.tokenizeNumber(s, 13);
  expect(length).toBe(1);
  length = TestUtil.tokenizeNumber(s, 15);
  expect(length).toBe(1);
});

test('Decimal sign', () => {
  const s = '+17 -32';
  let length = TestUtil.tokenizeNumber(s, 0);
  expect(length).toBe(3);
  length = TestUtil.tokenizeNumber(s, 4);
  expect(length).toBe(3);
});

test('Hex', () => {
  const s = '0x1 0xA12 0X12AB456C, 0x3+0x4';
  let length = TestUtil.tokenizeNumber(s, 0);
  expect(length).toBe(3);
  length = TestUtil.tokenizeNumber(s, 4);
  expect(length).toBe(5);
  length = TestUtil.tokenizeNumber(s, 10);
  expect(length).toBe(10);
  length = TestUtil.tokenizeNumber(s, 22);
  expect(length).toBe(3);
  length = TestUtil.tokenizeNumber(s, 26);
  expect(length).toBe(3);
});

test('Hex sign', () => {
  const s = '+0xA7 -0X32';
  let length = TestUtil.tokenizeNumber(s, 0);
  expect(length).toBe(5);
  length = TestUtil.tokenizeNumber(s, 6);
  expect(length).toBe(5);
});

test('Octal', () => {
  const s = '01 012 03+07';
  let length = TestUtil.tokenizeNumber(s, 0);
  expect(length).toBe(2);
  length = TestUtil.tokenizeNumber(s, 3);
  expect(length).toBe(3);
  length = TestUtil.tokenizeNumber(s, 7);
  expect(length).toBe(2);
  length = TestUtil.tokenizeNumber(s, 10);
  expect(length).toBe(2);
});

test('Octal sign', () => {
  const s = '+07 -01';
  let length = TestUtil.tokenizeNumber(s, 0);
  expect(length).toBe(3);
  length = TestUtil.tokenizeNumber(s, 4);
  expect(length).toBe(3);
});

test('Binary', () => {
  const s = '0b0 0b1 0b01 0B11+0B00';
  let length = TestUtil.tokenizeNumber(s, 0);
  expect(length).toBe(3);
  length = TestUtil.tokenizeNumber(s, 4);
  expect(length).toBe(3);
  length = TestUtil.tokenizeNumber(s, 8);
  expect(length).toBe(4);
  length = TestUtil.tokenizeNumber(s, 13);
  expect(length).toBe(4);
  length = TestUtil.tokenizeNumber(s, 18);
  expect(length).toBe(4);
});

test('Binary sign', () => {
  const s = '+0b1 -0B01';
  let length = TestUtil.tokenizeNumber(s, 0);
  expect(length).toBe(4);
  length = TestUtil.tokenizeNumber(s, 5);
  expect(length).toBe(5);
});

test('Float simple', () => {
  const s = '1. 1.0 +2. -40.0';
  let length = TestUtil.tokenizeNumber(s, 0);
  expect(length).toBe(2);
  length = TestUtil.tokenizeNumber(s, 3);
  expect(length).toBe(3);
  length = TestUtil.tokenizeNumber(s, 7);
  expect(length).toBe(3);
  length = TestUtil.tokenizeNumber(s, 11);
  expect(length).toBe(5);
});

test('Float starts with 0', () => {
  const s = '0. 0.0 +0. -05e12';
  let length = TestUtil.tokenizeNumber(s, 0);
  expect(length).toBe(2);
  length = TestUtil.tokenizeNumber(s, 3);
  expect(length).toBe(3);
  length = TestUtil.tokenizeNumber(s, 7);
  expect(length).toBe(3);
  length = TestUtil.tokenizeNumber(s, 11);
  expect(length).toBe(6);
});

test('Float exponents', () => {
  const s = '+3e1 0.5e-11 +0.7e+17 -.4E12';
  let length = TestUtil.tokenizeNumber(s, 0);
  expect(length).toBe(4);
  length = TestUtil.tokenizeNumber(s, 5);
  expect(length).toBe(7);
  length = TestUtil.tokenizeNumber(s, 13);
  expect(length).toBe(8);
  length = TestUtil.tokenizeNumber(s, 22);
  expect(length).toBe(6);
});

test('NaN 1', () => {
  const s = '+3A 4( 7[ 80{';
  let length = TestUtil.tokenizeNumber(s, 0);
  expect(length).toBe(0);
  length = TestUtil.tokenizeNumber(s, 4);
  expect(length).toBe(0);
  length = TestUtil.tokenizeNumber(s, 7);
  expect(length).toBe(0);
  length = TestUtil.tokenizeNumber(s, 10);
  expect(length).toBe(0);
});

test('NaN 2', () => {
  const s = '0xZ 0b3 09 +e -e+';
  let length = TestUtil.tokenizeNumber(s, 0);
  expect(length).toBe(0);
  length = TestUtil.tokenizeNumber(s, 4);
  expect(length).toBe(0);
  length = TestUtil.tokenizeNumber(s, 8);
  expect(length).toBe(0);
});

