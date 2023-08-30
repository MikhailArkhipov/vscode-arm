// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextRangeCollection } from "../../text/textRangeCollection";
import { TokenStream } from "../../tokens/tokenStream";
import { Token, TokenType } from "../../tokens/tokens";

function createTokenStream(tokens: Token[]): TokenStream {
  return new TokenStream(new TextRangeCollection<Token>(tokens), new Token(TokenType.EndOfStream, 0, 0));
}

test("TokenStream empty", () => {
  var tokens: Token[] = [];
  var ts = createTokenStream(tokens);

  expect(ts.length).toBe(0);
  expect(ts.isEndOfStream()).toBe(true);

  expect(ts.currentToken.tokenType).toBe(TokenType.EndOfStream);
  expect(ts.nextToken.tokenType).toBe(TokenType.EndOfStream);
  expect(ts.previousToken.tokenType).toBe(TokenType.EndOfStream);
  expect(ts.position).toBe(0);

  var token = ts.advance(10);
  expect(ts.currentToken.tokenType).toBe(TokenType.EndOfStream);
  expect(ts.isEndOfStream()).toBe(true);
  expect(ts.position).toBe(0);

  token = ts.advance(-100);
  expect(ts.currentToken.tokenType).toBe(TokenType.EndOfStream);
  expect(ts.position).toBe(0);

  expect(ts.currentToken.tokenType).toBe(TokenType.EndOfStream);
  expect(ts.nextToken.tokenType).toBe(TokenType.EndOfStream);
  expect(ts.previousToken.tokenType).toBe(TokenType.EndOfStream);

  ts.position = 0;
  expect(ts.isEndOfStream()).toBe(true);
  expect(ts.position).toBe(0);

  ts.moveToNextToken();
  expect(ts.isEndOfStream()).toBe(true);
  expect(ts.position).toBe(0);
});

test("TokenStream test 1", () => {
  var tokens: Token[] = [
    new Token(TokenType.Comma, 0, 1),
    new Token(TokenType.Comment, 3, 1),
    new Token(TokenType.String, 6, 2),
    new Token(TokenType.Word, 12, 8),
    new Token(TokenType.Unknown, 20, 1),
  ];

  var ts = createTokenStream(tokens);
  expect(ts.length).toBe(5);

  expect(ts.isEndOfStream()).toBe(false);
  expect(ts.currentToken.tokenType).toBe(TokenType.Comma);
  expect(ts.nextToken.tokenType).toBe(TokenType.Comment);
  expect(ts.previousToken.tokenType).toBe(TokenType.EndOfStream);
  expect(ts.position).toBe(0);

  ts.moveToNextToken();

  expect(ts.isEndOfStream()).toBe(false);
  expect(ts.currentToken.tokenType).toBe(TokenType.Comment);
  expect(ts.nextToken.tokenType).toBe(TokenType.String);
  expect(ts.previousToken.tokenType).toBe(TokenType.Comma);
  expect(ts.lookAhead(-2).tokenType).toBe(TokenType.EndOfStream);
  expect(ts.lookAhead(100).tokenType).toBe(TokenType.EndOfStream);
  expect(ts.position).toBe(1);

  ts.advance(2);

  expect(ts.currentToken.tokenType).toBe(TokenType.Word);
  expect(ts.nextToken.tokenType).toBe(TokenType.Unknown);
  expect(ts.previousToken.tokenType).toBe(TokenType.String);
  expect(ts.lookAhead(-2).tokenType).toBe(TokenType.Comment);
  expect(ts.lookAhead(100).tokenType).toBe(TokenType.EndOfStream);
  expect(ts.position).toBe(3);

  ts.moveToNextToken();
  ts.moveToNextToken();

  expect(ts.isEndOfStream()).toBe(true);
  expect(ts.currentToken.tokenType).toBe(TokenType.EndOfStream);
  expect(ts.nextToken.tokenType).toBe(TokenType.EndOfStream);
  expect(ts.previousToken.tokenType).toBe(TokenType.Unknown);

  ts.moveToNextToken();

  expect(ts.isEndOfStream()).toBe(true);
  expect(ts.currentToken.tokenType).toBe(TokenType.EndOfStream);
  expect(ts.nextToken.tokenType).toBe(TokenType.EndOfStream);
  expect(ts.previousToken.tokenType).toBe(TokenType.Unknown);

  ts.advance(-2);

  expect(ts.currentToken.tokenType).toBe(TokenType.Word);
  expect(ts.nextToken.tokenType).toBe(TokenType.Unknown);
  expect(ts.previousToken.tokenType).toBe(TokenType.String);
  expect(ts.lookAhead(-2).tokenType).toBe(TokenType.Comment);
  expect(ts.lookAhead(100).tokenType).toBe(TokenType.EndOfStream);
  expect(ts.position).toBe(3);
});
