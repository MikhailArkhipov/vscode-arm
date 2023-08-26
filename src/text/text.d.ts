// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

declare namespace Text {
  /**
   *    Represents range of text in a text source.
   */
  export interface ITextRange {
    readonly start: number;
    readonly end: number;
    readonly length: number;
    contains(position: number): boolean;
    shift(offset: number): void;
  }

  /**
   *    Abstracts character iteraction over text source.
   */
  export interface ITextIterator {
    readonly length: number;
    charAt(position: number): string;
  }

   /**
   *    Abstract text provider.
   */
  export interface ITextProvider extends ITextIterator {
    getText(): string;
    getText(start: number, length: number): string;
    indexOf(text: string, startPosition: number, ignoreCase: boolean): number;
    compareTo(
      position: number,
      length: number,
      text: string,
      ignoreCase: boolean
    ): boolean;
    readonly version: number;
  }
}