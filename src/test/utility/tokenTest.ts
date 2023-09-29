// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { LanguageOptions } from '../../core/languageOptions';
import { CharacterStream } from '../../text/characterStream';
import { TextStream } from '../../text/textStream';
import { TokenType, Token, TokenSubType } from '../../tokens/definitions';
import { NumberTokenizer } from '../../tokens/numberTokenizer';
import { Tokenizer } from '../../tokens/tokenizer';
import { makeLanguageOptions } from './parsing';

export namespace TokenTest {
  export function getTokenName(t: TokenType): string {
    return TokenType[t];
  }

  export function getTokenString(t: Token): string {
    const name = getTokenName(t.type);
    return `${name} : ${t.start} - ${t.end} (${t.length})`;
  }

  export function tokenizeToArray(text: string, options?: LanguageOptions): readonly Token[] {
    options = options ?? makeLanguageOptions(true);
    const t = new Tokenizer(options);
    return t.tokenize(new TextStream(text), 0, text.length);
  }

  export function tokenizeNumber(text: string, start: number = 0): number {
    const cs = new CharacterStream(new TextStream(text));
    const nt = new NumberTokenizer(cs);
    cs.position = start;
    return nt.tryNumber();
  }

  export function verifyTokenTypes(actual: readonly Token[], expected: readonly TokenType[]): void {
    expect(actual.length).toBe(expected.length);
    for (let i = 0; i < actual.length; i++) {
      expect(actual[i].type).toBe(expected[i]);
    }
  }
  
  export function verifyTokenSubTypes(actual: readonly Token[], expected: readonly TokenSubType[]): void {
    expect(actual.length).toBe(expected.length);
    for (let i = 0; i < actual.length; i++) {
      expect(actual[i].subType).toBe(expected[i]);
    }
  }
}
