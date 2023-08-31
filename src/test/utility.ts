// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as fs from 'fs'

import { AssemblerType, SyntaxConfig } from "../syntaxConfig";
import { Character } from "../text/charCodes";
import { TextStream } from "../text/textStream";
import { Tokenizer } from "../tokens/tokenizer";
import { Token, TokenType } from "../tokens/tokens";
import { TextRangeCollection } from '../text/textRangeCollection';
import { Parser } from '../parser/parser';
import { AstRoot } from '../AST/astRoot';

export namespace TestUtil {
  export function getTokenName(t: TokenType): string {
    return TokenType[t];
  }

  export function getTokenString(t: Token): string {
    var name = TestUtil.getTokenName(t.tokenType);
    return `${name} : ${t.start} - ${t.end} (${t.length})`;
  }

  export function tokenizeToArray(text: string, separateComments:boolean = false): TextRangeCollection<Token> {
    var t = new Tokenizer(SyntaxConfig.create(AssemblerType.GNU));
    return t.tokenize(new TextStream(text), 0, text.length, separateComments).tokens;
  }

  export function tokenize(text: string, separateComments:boolean = false): 
  { tokens: TextRangeCollection<Token>, comments: TextRangeCollection<Token>} {
    var t = new Tokenizer(SyntaxConfig.create(AssemblerType.GNU));
    return t.tokenize(new TextStream(text), 0, text.length, separateComments);
  }

  export function tokenizeToString(text: string): string[] {
    var tokens = tokenizeToArray(text);
    var ts: string[] = [];
    for (var i = 0; i < tokens.count; i++) {
      ts.push(getTokenString(tokens.getItemAt(i)));
    }
    return ts;
  }

  // Compares result to a baseline file line by line.
  export function compareFiles(baselineFile: string, actualResult: string[], regenerateBaseline: boolean): void {
    if(regenerateBaseline) {
      var result = actualResult.join("\n");
      fs.writeFileSync(baselineFile, result);
      return;
    } 

    var baselineContent = fs.readFileSync(baselineFile).toString();
    var lines = baselineContent.split("\n");

    for(var i = 0; i < lines.length; i++) {
      var diff = compareLines(lines[i].trim(), actualResult[i]);
      expect(diff).toBe(-1);
    }
  }

  export function compareLines(expectedLine: string, actualLine: string): number {
    var minLength = Math.min(expectedLine.length, actualLine.length);
    var i = 0;
    for (i = 0; i < minLength; i++) {
        var act = actualLine.charAt(i);
        var exp = expectedLine.charAt(i);
        if (act !== exp) {
            return i;
        }
    }

    if(expectedLine.length === actualLine.length) {
      return -1;
    }

    if(expectedLine.length > actualLine.length) {
      // whitespace is irrelevant
      for (var j = i; j < expectedLine.length; j++) {
        if(!Character.isWhitespace(expectedLine.charCodeAt(i))) {
          return i;
        }
      }     
    }

    for (var j = i; j < actualLine.length; j++) {
      if(!Character.isWhitespace(actualLine.charCodeAt(i))) {
        return i;
      }
    }     

    return -1;
  }

  export function parseText(text: string): AstRoot {
    var config = SyntaxConfig.create(AssemblerType.GNU);
    var p = new Parser();
    return p.parse(new TextStream(text), config);
  }
}
