// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TokenStream } from "../../tokens/tokenStream";
import { Token, TokenType } from "../../tokens/tokens";

function createTokenStream(tokens: Token[]): TokenStream {
  return new TokenStream(tokens);
}

test("TokenStream empty", () => {
  const tokens: Token[] = [];
  const ts = createTokenStream(tokens);

  expect(ts.length).toBe(0);
  expect(ts.isEndOfStream()).toBe(true);

  expect(ts.currentToken.type).toBe(TokenType.EndOfStream);
  expect(ts.nextToken.type).toBe(TokenType.EndOfStream);
  expect(ts.previousToken.type).toBe(TokenType.EndOfStream);
  expect(ts.position).toBe(0);

  ts.advance(10);
  expect(ts.currentToken.type).toBe(TokenType.EndOfStream);
  expect(ts.isEndOfStream()).toBe(true);
  expect(ts.position).toBe(0);

  ts.advance(-100);
  expect(ts.currentToken.type).toBe(TokenType.EndOfStream);
  expect(ts.position).toBe(0);

  expect(ts.currentToken.type).toBe(TokenType.EndOfStream);
  expect(ts.nextToken.type).toBe(TokenType.EndOfStream);
  expect(ts.previousToken.type).toBe(TokenType.EndOfStream);

  ts.position = 0;
  expect(ts.isEndOfStream()).toBe(true);
  expect(ts.position).toBe(0);

  ts.moveToNextToken();
  expect(ts.isEndOfStream()).toBe(true);
  expect(ts.position).toBe(0);
});

test("TokenStream test 1", () => {
  const tokens: Token[] = [
    new Token(TokenType.Comma, 0, 1),
    new Token(TokenType.LineComment, 3, 1),
    new Token(TokenType.Label, 6, 2),
    new Token(TokenType.Symbol, 12, 8),
    new Token(TokenType.Unknown, 20, 1),
  ];

  const ts = createTokenStream(tokens);
  expect(ts.length).toBe(5);

  expect(ts.isEndOfStream()).toBe(false);
  expect(ts.currentToken.type).toBe(TokenType.Comma);
  expect(ts.nextToken.type).toBe(TokenType.LineComment);
  expect(ts.previousToken.type).toBe(TokenType.EndOfStream);
  expect(ts.position).toBe(0);

  ts.moveToNextToken();

  expect(ts.isEndOfStream()).toBe(false);
  expect(ts.currentToken.type).toBe(TokenType.LineComment);
  expect(ts.nextToken.type).toBe(TokenType.Label);
  expect(ts.previousToken.type).toBe(TokenType.Comma);
  expect(ts.lookAhead(-2).type).toBe(TokenType.EndOfStream);
  expect(ts.lookAhead(100).type).toBe(TokenType.EndOfStream);
  expect(ts.position).toBe(1);

  ts.advance(2);

  expect(ts.currentToken.type).toBe(TokenType.Symbol);
  expect(ts.nextToken.type).toBe(TokenType.Unknown);
  expect(ts.previousToken.type).toBe(TokenType.Label);
  expect(ts.lookAhead(-2).type).toBe(TokenType.LineComment);
  expect(ts.lookAhead(100).type).toBe(TokenType.EndOfStream);
  expect(ts.position).toBe(3);

  ts.moveToNextToken();
  ts.moveToNextToken();

  expect(ts.isEndOfStream()).toBe(true);
  expect(ts.currentToken.type).toBe(TokenType.EndOfStream);
  expect(ts.nextToken.type).toBe(TokenType.EndOfStream);
  expect(ts.previousToken.type).toBe(TokenType.Unknown);

  ts.moveToNextToken();

  expect(ts.isEndOfStream()).toBe(true);
  expect(ts.currentToken.type).toBe(TokenType.EndOfStream);
  expect(ts.nextToken.type).toBe(TokenType.EndOfStream);
  expect(ts.previousToken.type).toBe(TokenType.Unknown);

  ts.advance(-2);

  expect(ts.currentToken.type).toBe(TokenType.Symbol);
  expect(ts.nextToken.type).toBe(TokenType.Unknown);
  expect(ts.previousToken.type).toBe(TokenType.Label);
  expect(ts.lookAhead(-2).type).toBe(TokenType.LineComment);
  expect(ts.lookAhead(100).type).toBe(TokenType.EndOfStream);
  expect(ts.position).toBe(3);
});
