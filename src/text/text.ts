// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

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

export function makeWhitespace(amount: number): string {
  return new Array(amount + 1).join(' ');
}
