// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { AstNode, AstRoot, ParseError, ParseErrorType, Statement, TokenNode } from './definitions';
import { ParseContext } from '../parser/parseContext';
import { TextStream } from '../text/textStream';
import { AstNodeImpl } from './astNode';
import { TextProvider, TextRangeCollection } from '../text/definitions';
import { Token, TokenSubType, TokenType } from '../tokens/definitions';
import { EmptyStatementImpl, StatementImpl, UnknownStatementImpl } from './statement';
import { TokenNodeImpl } from './tokenNode';
import { UnexpectedItemError } from '../parser/parseError';
import { GeneralDirectiveStatementImpl } from './directive';
import { TextRangeCollectionImpl } from '../text/textRangeCollection';
import { DeclarationDirectiveStatementImpl } from './symbolDeclaration';
import { InstructionStatementImpl } from './instruction';
import { MacroDirectiveStatementImpl } from './macro';
import { DefinitionDirectiveStatementImpl, EqualsDefinitionStatementImpl } from './symbolDefinition';

export class AstRootImpl extends AstNodeImpl implements AstRoot {
  // Includes comments, as opposed to the filtered set in ParseContext.
  private readonly _tokens: readonly Token[];
  private _context: ParseContext;

  public readonly version: number;

  constructor(tokens: readonly Token[], version = 0) {
    super();
    this._parent = this;
    this._tokens = tokens;
    this.version = version;
  }

  // Recursive descent parser
  public parse(context: ParseContext, parent?: AstNode | undefined): boolean {
    this._context = context;

    // Code is a sequence of statements. Statement can be a directive, instruction
    // or an empty line. Empty line is still recorded as an empty statement
    // since it helps formatter to preserve blank lines as needed. Anything that is
    // not recognized is recorded as an 'unknown statement'.
    while (!context.tokens.isEndOfStream()) {
      const statement = createStatement(context);
      statement.parse(context, this);

      if (!context.tokens.isEndOfLine()) {
        throw Error('Parser: must be at the end of a line.');
      }
      // Skip line break. Thi is no-op at the end of the file
      context.moveToNextToken();
    }
    // Rewind back as a courtesy to potential users downstream.
    this._context.tokens.position = 0;
    transferTokenSubtypes(this._context.tokens.asArray(), this.tokens.asArray());
    return true;
  }

  public static create(text: string, instructionSet: string, tokens: readonly Token[], version = 0): AstRoot {
    const ast = new AstRootImpl(tokens, version);
    const context = new ParseContext(ast, new TextStream(text), instructionSet, tokens);
    ast.parse(context);
    return ast;
  }

  // AstRoot
  public get text(): TextProvider {
    return this._context.text;
  }
  public get tokens(): TextRangeCollection<Token> {
    return new TextRangeCollectionImpl(this._tokens);
  }
  public get instructionSet(): string {
    return this._context.instructionSet;
  }
  public get errors(): readonly ParseError[] {
    return this._context.errors;
  }
  public get definitions(): readonly TokenNode[] {
    return this._context.definitions;
  }
  public get declarations(): readonly TokenNode[] {
    return this._context.declarations;
  }

  public get labels(): readonly Token[] {
    return this.statements
      .filter((s) => s.label)
      .map((s) => s.label!.token);
  }

  public get statements(): readonly Statement[] {
    return this.children
      .asArray()
      .map((e) => e as Statement)
      .filter((e) => e);
  }

  public toString(): string {
    return `Root: [${this.start}...${this.end})`;
  };
}

function createStatement(context: ParseContext): StatementImpl {
  let label: TokenNode | undefined;
  if (context.currentToken.type === TokenType.Label) {
    // Don't set parent yet, the label belongs to the statement.
    label = TokenNodeImpl.create(context, undefined); 
  }

  switch (context.currentToken.type) {
    case TokenType.EndOfLine:
    case TokenType.EndOfStream:
      // {label:} => empty statement
      return new EmptyStatementImpl(label);

    case TokenType.Symbol:
      // Consider 'symbol = expression' statement that is  the same as 'label: expression'
      if (context.nextToken.type === TokenType.Operator && context.getTokenText(context.nextToken) === '=') {
        return new EqualsDefinitionStatementImpl(label);
      }
      return new InstructionStatementImpl(label);

    case TokenType.Directive:
      return createDirectiveStatement(context, label);

    default:
      // {label:} ??? => Unknown statement
      context.addError(new UnexpectedItemError(ParseErrorType.NameExpected, context.currentToken));
      return new UnknownStatementImpl(label);
  }
}

function createDirectiveStatement(context: ParseContext, label: TokenNode | undefined): StatementImpl {
  const ct = context.tokens.currentToken;
  if (ct.type !== TokenType.Directive) {
    throw new Error('Parser: must be at directive token.');
  }
  switch (ct.subType) {
    case TokenSubType.Definition:
      return new DefinitionDirectiveStatementImpl(label);
    case TokenSubType.Declaration:
      return new DeclarationDirectiveStatementImpl(label);
    case TokenSubType.BeginMacro:
      // TODO: create actual macro block? Would help to detect missing .endm
      // and perhaps apply different syntax check on parameters and labels?
      return new MacroDirectiveStatementImpl(label);
    default:
      return new GeneralDirectiveStatementImpl(label);
  }
}

function transferTokenSubtypes(updatedTokens: readonly Token[], rawTokens: readonly Token[]): void {
  for (let i = 0, j = 0; i < updatedTokens.length && j < rawTokens.length; j++) {
    const rt = rawTokens[j];
    if (Token.isComment(rt)) {
      continue;
    }
    const ut = updatedTokens[i];
    if (rt.type !== ut.type || rt.start !== ut.start || rt.length !== ut.length) {
      throw new Error('Inconsistent token types between AST and parse context sets.');
    }
    rt.subType = ut.subType;
    i++;
  }
}
