// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { Char } from "../../text/charCodes";
import { CharacterStream } from "../../text/characterStream";
import { TextStream } from "../../text/textStream";

test("CharacterStream empty", () => {
  const cs = new CharacterStream(new TextStream(""));
  expect(cs.length).toBe(0);
  expect(cs.position).toBe(0);
  expect(cs.isAtNewLine()).toBe(false);
  expect(cs.isEndOfStream()).toBe(true);
  expect(cs.isWhiteSpace()).toBe(false); 

  cs.advance(1); 
  expect(cs.position).toBe(0);
  expect(cs.isAtNewLine()).toBe(false);
  expect(cs.isEndOfStream()).toBe(true);

  cs.skipLineBreak(); 
  expect(cs.position).toBe(0);
  expect(cs.isAtNewLine()).toBe(false);
  expect(cs.isEndOfStream()).toBe(true);

  cs.skipToWhitespace();
  expect(cs.position).toBe(0);
  expect(cs.isAtNewLine()).toBe(false);
  expect(cs.isEndOfStream()).toBe(true);

  cs.skipWhitespace();
  expect(cs.position).toBe(0);
  expect(cs.isAtNewLine()).toBe(false);
  expect(cs.isEndOfStream()).toBe(true);

  cs.moveToEol();
  expect(cs.position).toBe(0);
  expect(cs.isAtNewLine()).toBe(false);
  expect(cs.isEndOfStream()).toBe(true);

  cs.moveToNextChar();
  expect(cs.position).toBe(0);
  expect(cs.isAtNewLine()).toBe(false);
  expect(cs.isEndOfStream()).toBe(true);

  cs.moveToNextLine();
  expect(cs.position).toBe(0);
  expect(cs.isAtNewLine()).toBe(false);
  expect(cs.isEndOfStream()).toBe(true);
});

test("CharacterStream space", () => {
  const cs = new CharacterStream(new TextStream(" "));
  expect(cs.length).toBe(1);
  expect(cs.position).toBe(0);
  expect(cs.isAtNewLine()).toBe(false);
  expect(cs.isEndOfStream()).toBe(false);
  expect(cs.isWhiteSpace()).toBe(true); 

  cs.moveToNextChar();
  expect(cs.position).toBe(1);
  expect(cs.isAtNewLine()).toBe(false);
  expect(cs.isEndOfStream()).toBe(true);
});

test("CharacterStream tab", () => {
  const cs = new CharacterStream(new TextStream("\t"));
  expect(cs.length).toBe(1);
  expect(cs.position).toBe(0);
  expect(cs.isAtNewLine()).toBe(false);
  expect(cs.isEndOfStream()).toBe(false);
  expect(cs.isWhiteSpace()).toBe(true); 

  cs.moveToNextChar();
  expect(cs.position).toBe(1);
  expect(cs.isAtNewLine()).toBe(false);
  expect(cs.isEndOfStream()).toBe(true);
});

test("CharacterStream line feed", () => {
  const cs = new CharacterStream(new TextStream(" \n"));
  expect(cs.length).toBe(2);
  expect(cs.position).toBe(0);
  expect(cs.isAtNewLine()).toBe(false);
  expect(cs.isEndOfStream()).toBe(false);
  expect(cs.isWhiteSpace()).toBe(true); 

  cs.moveToNextChar();
  expect(cs.position).toBe(1);
  expect(cs.isAtNewLine()).toBe(true);
  expect(cs.isEndOfStream()).toBe(false);

  cs.skipLineBreak();
  expect(cs.position).toBe(2);
  expect(cs.isAtNewLine()).toBe(false);
  expect(cs.isEndOfStream()).toBe(true);
});

test("CharacterStream carriage return", () => {
  const cs = new CharacterStream(new TextStream("\r\n"));
  expect(cs.length).toBe(2);
  expect(cs.position).toBe(0);
  expect(cs.isAtNewLine()).toBe(true);
  expect(cs.isEndOfStream()).toBe(false);
  expect(cs.isWhiteSpace()).toBe(true); 

  cs.moveToNextChar();
  expect(cs.position).toBe(1);
  expect(cs.isAtNewLine()).toBe(true);
  expect(cs.isEndOfStream()).toBe(false);

  cs.advance(-1);
  expect(cs.position).toBe(0);
  expect(cs.isAtNewLine()).toBe(true);
  expect(cs.isEndOfStream()).toBe(false);

  cs.skipLineBreak();
  expect(cs.position).toBe(2);
  expect(cs.isAtNewLine()).toBe(false);
  expect(cs.isEndOfStream()).toBe(true);
});

test("CharacterStream text", () => {
  const text = "a bc\n\tdef";
  const cs = new CharacterStream(new TextStream(text));
  expect(cs.length).toBe(text.length);
  expect(cs.position).toBe(0);
  expect(cs.currentChar).toBe(Char.a);
  
  cs.skipToWhitespace();
  expect(cs.position).toBe(1);
  expect(cs.currentChar).toBe(Char.Space);

  cs.advance(-10)
  expect(cs.position).toBe(0);
  cs.moveToNextChar();
  cs.skipWhitespace();
  expect(cs.position).toBe(2);
  expect(cs.currentChar).toBe(Char.b);
  expect(cs.prevChar).toBe(Char.Space);
  expect(cs.nextChar).toBe(Char.c);

  cs.advance(2);
  expect(cs.position).toBe(4);
  expect(cs.currentChar).toBe(Char.LineFeed);
  expect(cs.prevChar).toBe(Char.c);
  expect(cs.nextChar).toBe(Char.Tab);

  cs.skipLineBreak();
  expect(cs.position).toBe(5);
  expect(cs.currentChar).toBe(Char.Tab);
  expect(cs.prevChar).toBe(Char.LineFeed);
  expect(cs.nextChar).toBe(Char.d);
});