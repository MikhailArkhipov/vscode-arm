// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as fs from 'fs'

import { AssemblerType, SyntaxConfig } from "../core/syntaxConfig";
import { Character } from "../text/charCodes";
import { TextStream } from "../text/textStream";
import { Tokenizer } from "../tokens/tokenizer";
import { Token, TokenType } from "../tokens/tokens";
import { TextRangeCollection } from '../text/textRangeCollection';
import { NumberTokenizer } from '../tokens/numberTokenizer';
import { CharacterStream } from '../text/characterStream';
// import { Parser } from '../parser/parser';
// import { AstRoot } from '../AST/astRoot';

export namespace TestUtil {
  export function getTokenName(t: TokenType): string {
    return TokenType[t];
  }

  export function getTokenString(t: Token): string {
    const name = TestUtil.getTokenName(t.tokenType);
    return `${name} : ${t.start} - ${t.end} (${t.length})`;
  }

  export function tokenizeToArray(text: string): TextRangeCollection<Token> {
    const t = new Tokenizer(SyntaxConfig.create(AssemblerType.GNU));
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
      expect(actual.getItemAt(i).tokenType).toBe(expected[i]);
    }
  }
  
  // Compares result to a baseline file line by line.
  export function compareFiles(baselineFile: string, actualResult: string[], regenerateBaseline: boolean): void {
    if(regenerateBaseline) {
      const result = actualResult.join("\n");
      fs.writeFileSync(baselineFile, result);
      return;
    } 

    const baselineContent = fs.readFileSync(baselineFile).toString();
    const lines = baselineContent.split("\n");

    for(let i = 0; i < lines.length; i++) {
      const diff = compareLines(lines[i].trim(), actualResult[i]);
      expect(diff).toBe(-1);
    }
  }

  export function compareLines(expectedLine: string, actualLine: string): number {
    const minLength = Math.min(expectedLine.length, actualLine.length);
    let i = 0;
    for (i = 0; i < minLength; i++) {
        const act = actualLine.charAt(i);
        const exp = expectedLine.charAt(i);
        if (act !== exp) {
            return i;
        }
    }

    if(expectedLine.length === actualLine.length) {
      return -1;
    }

    if(expectedLine.length > actualLine.length) {
      // whitespace is irrelevant
      for (let j = i; j < expectedLine.length; j++) {
        if(!Character.isWhitespace(expectedLine.charCodeAt(i))) {
          return i;
        }
      }     
    }

    for (let j = i; j < actualLine.length; j++) {
      if(!Character.isWhitespace(actualLine.charCodeAt(i))) {
        return i;
      }
    }     

    return -1;
  }

  // export function parseText(text: string): AstRoot {
  //   const config = SyntaxConfig.create(AssemblerType.GNU);
  //   const p = new Parser();
  //   return p.parse(new TextStream(text), config, 0);
  // }
}
