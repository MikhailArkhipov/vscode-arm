// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { LanguageOptions } from '../../core/languageOptions';
import { CharacterStream } from '../../text/characterStream';
import { TextRangeCollection } from '../../text/textRangeCollection';
import { TextStream } from '../../text/textStream';
import { NumberTokenizer } from '../../tokens/numberTokenizer';
import { Tokenizer } from '../../tokens/tokenizer';
import { Token, TokenType } from '../../tokens/tokens';
import { makeLanguageOptions } from '../parser/parseUtility';

export namespace TokenTest {
  export function getTokenName(t: TokenType): string {
    return TokenType[t];
  }

  export function getTokenString(t: Token): string {
    const name = getTokenName(t.type);
    return `${name} : ${t.start} - ${t.end} (${t.length})`;
  }

  export function tokenizeToArray(text: string, options?: LanguageOptions): TextRangeCollection<Token> {
    options = options ?? makeLanguageOptions(true, true);
    const t = new Tokenizer(options);
    return t.tokenize(new TextStream(text), 0, text.length);
  }

  export function tokenizeNumber(text: string, start: number = 0): number {
    const cs = new CharacterStream(new TextStream(text));
    const nt = new NumberTokenizer(cs);
    cs.position = start;
    return nt.tryNumber();
  }

  export function verifyTokenTypes(actual: TextRangeCollection<Token>, expected: TokenType[]): void {
    expect(actual.count).toBe(expected.length);
    for (let i = 0; i < actual.count; i++) {
      expect(actual.getItemAt(i).type).toBe(expected[i]);
    }
  }
}
