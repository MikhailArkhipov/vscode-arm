// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import {
  Associativity,
  AstNode,
  ErrorLocation,
  Expression,
  Operator,
  OperatorType,
  ParseError,
  ParseErrorType,
  TokenNode,
} from './definitions';
import { TextRange } from '../text/textRange';
import { TokenSubType, TokenType } from '../tokens/tokens';
import { ParseContext } from '../parser/parseContext';
import { OperatorImpl, TokenOperatorImpl } from './operator';
import { GroupImpl } from './group';
import { TokenNodeImpl } from './tokenNode';
import { ParseErrorImpl, UnexpectedItemError } from '../parser/parseError';
import { AstNodeImpl } from './astNode';
import { CommaSeparatedListImpl } from './commaSeparatedList';

// Heavily based on code in Microsoft RTVS, see
// https://github.com/microsoft/RTVS/blob/master/src/R/Core/Impl/AST/Expressions/ExpressionParser.cs

// Implements shunting yard algorithm of expression parsing.
// https://en.wikipedia.org/wiki/Shunting-yard_algorithm

// Describes current and previous operation types in the current expression.
// Helps to detect errors like missing operands or operators.
const enum OperationType {
  None = 0,
  UnaryOperator = 1,
  BinaryOperator = 2,
  Operand = 3,
  EndOfExpression = 4,
}

const sentinel = new TokenOperatorImpl(false, OperatorType.Sentinel);

interface ParseResult {
  operationType: OperationType;
  errorType: ParseErrorType;
}

export class ExpressionImpl extends AstNodeImpl implements Expression {
  private _content: AstNode | undefined;
  private _start: number; // If expression is empty we still need start position.
  private _nestedListAllowed = true;
  private _operationType = OperationType.None;
  private _errorType = ParseErrorType.None;

  constructor(nestedListAllowed?: boolean) {
    super();
    this._nestedListAllowed = nestedListAllowed ?? true;
  }

  // Expression
  public get content(): AstNode | undefined {
    return this._content;
  }

  // TextRange
  public get start(): number {
    return this._content ? this._content.start : this._start;
  }
  public get end(): number {
    return this._content ? this._content.end : this._start;
  }
  public get length(): number {
    return this.end - this.start;
  }

  // https://en.wikipedia.org/wiki/Shunting-yard_algorithm
  private readonly _operands: AstNode[] = [];
  private readonly _operators: OperatorImpl[] = [];
  private _previousOperationType = OperationType.None;

  public parse(context: ParseContext, parent: AstNode | undefined) {
    // http://www.engr.mun.ca/~theo/Misc/exp_parsing.htm
    // Instead of evaluating expressions like calculator would do,
    // we create tree nodes with operator and its operands.
    const tokens = context.tokens;
    let endOfExpression = false;
    // Push sentinel
    this._operators.push(sentinel);
    this._start = context.currentToken.start;

    skipAddressOperator(context); // Skip over =, if any.

    while (!tokens.isEndOfLine() && this._errorType === ParseErrorType.None && !endOfExpression) {
      const ct = tokens.currentToken;

      switch (ct.type) {
        // Terminal constants
        case TokenType.Number:
        case TokenType.String:
        case TokenType.Symbol:
          this.handleTokenOperand(context);
          break;

        case TokenType.OpenBracket:
        case TokenType.OpenCurly:
          this.handleList(context);
          break;

        case TokenType.OpenBrace:
          this.handleGroup(context);
          break;

        case TokenType.Operator:
          this.handleOperator(context);
          break;

        case TokenType.Comma:
        case TokenType.CloseBrace:
        case TokenType.CloseCurly:
        case TokenType.CloseBracket:
          this._operationType = OperationType.EndOfExpression;
          endOfExpression = true;
          break;

        default:
          this._errorType = ParseErrorType.UnexpectedToken;
          break;
      }

      if (this._errorType === ParseErrorType.None && !this.isConsistentOperationSequence(context)) {
        return false;
      }

      if (this._errorType !== ParseErrorType.None || endOfExpression) {
        break;
      }

      this._previousOperationType = this._operationType;
    }

    if (this._operators.length > 1) {
      // If there are still operators to process, construct the final subtree.
      // After that only the sentinel operator should be in the operators stack
      // and a single final root node in the operand stack.
      this.processHigherPrecendenceOperators(context, sentinel);
    }

    if (this._errorType !== ParseErrorType.None) {
      // Although there may be errors we still want to include the result into the tree
      if (this._operands.length === 1) {
        this._content = this._operands.pop()!;
        this.appendChild(this._content);
      }
    } else {
      if (this._operators.length !== 1) {
        // At this point we should only have sentinel remaining on the stack.
        throw new Error('Expression parser: inconsistent operator stack.');
      }
      // If operand stack is empty and there is no error then the expression is empty.
      if (this._operands.length > 0) {
        this._content = this._operands.pop()!;
        this.appendChild(this._content);
      }
    }

    super.parse(context, parent);
    return this._errorType === ParseErrorType.None;
  }

  private isConsistentOperationSequence(context: ParseContext): boolean {
    // Binary operator followed by another binary like 'a +/ b' is an error.
    // Binary operator without anything behind it is an error;
    if (this._previousOperationType === this._operationType) {
      switch (this._operationType) {
        case OperationType.Operand:
          // 'operand operand' sequence is an error
          this.addError(
            context,
            new ParseErrorImpl(ParseErrorType.OperatorExpected, ErrorLocation.Token, this.getOperandErrorRange(context))
          );
          break;

        case OperationType.UnaryOperator:
          // 'unary unary' and 'binary unary' are OK
          return true;

        default:
          // 'operator operator' sequence is an error
          this.addError(
            context,
            new ParseErrorImpl(
              ParseErrorType.RightOperandExpected,
              ErrorLocation.Token,
              this.getOperatorErrorRange(context)
            )
          );
          break;
      }
      return false;
    }

    if (this._operationType === OperationType.BinaryOperator && context.tokens.isEndOfLine()) {
      // 'operator <EOF>' sequence is an error
      this.addError(
        context,
        new ParseErrorImpl(
          ParseErrorType.RightOperandExpected,
          ErrorLocation.Token,
          this.getOperatorErrorRange(context)
        )
      );
      return false;
    }

    if (
      this._previousOperationType === OperationType.UnaryOperator &&
      this._operationType === OperationType.BinaryOperator
    ) {
      // unary followed by binary doesn't make sense
      this.addError(
        context,
        new ParseErrorImpl(ParseErrorType.SymbolExpected, ErrorLocation.Token, this.getOperatorErrorRange(context))
      );
      return false;
    }

    if (
      this._previousOperationType === OperationType.BinaryOperator &&
      this._operationType === OperationType.EndOfExpression
    ) {
      // a +
      this.addError(
        context,
        new ParseErrorImpl(ParseErrorType.RightOperandExpected, ErrorLocation.Token, getErrorRange(context))
      );
      return false;
    }

    return true;
  }

  private handleTokenOperand(context: ParseContext): void {
    const constant = TokenNodeImpl.create(context, undefined);
    this._operands.push(constant);
    this._operationType = OperationType.Operand;
  }

  private handleGroup(context: ParseContext): void {
    // Nesting of braced comma-separated lists is not allowed.
    // Assembler allows 'pop {r1, r0}', 'ADR r12, {pc}+8', ldr r0, [pc, #-0],
    // but pop {r1, {...}} or 'mov r12, [sp + []]' are not legal.
    // Hence we are not handling opening [ or { here.

    // Note that 'ADD r1, r2, [sp-#12]' is, in fact, two legal nested lists:
    // first the operands list itself and then [...] nested inside it.
    // The statement operands are parsed as 'expression, expression, ...'
    // so we have to handle

    // () groups are permitted to nest since these are normal math expressions.
    const group = new GroupImpl();
    if (group.parse(context, undefined)) {
      this._operands.push(group);
      this._operationType = OperationType.Operand;
    } else {
      this._operationType = OperationType.EndOfExpression;
    }
  }

  private handleList(context: ParseContext): void {
    // Nesting of braced comma-separated lists is not allowed.
    // Assembler allows 'pop {r1, r0}', 'ADR r12, {pc}+8', ldr r0, [pc, #-0],
    // but pop {r1, {...}} or 'mov r12, [sp + []]' are not legal.

    // 'ADD r1, r2, [sp-#12]' is, in fact, two legal nested lists:
    // first the operands list itself and then [...] nested inside it.

    if (!this._nestedListAllowed) {
      this.addError(context, new UnexpectedItemError(ParseErrorType.UnexpectedToken, context.currentToken));
      this._operationType = OperationType.EndOfExpression;
      return;
    }

    const list = new CommaSeparatedListImpl();
    if (list.parse(context, undefined)) {
      this._operands.push(list);
      this._operationType = OperationType.Operand;
    } else {
      this._operationType = OperationType.EndOfExpression;
    }
  }

  private handleOperator(context: ParseContext): void {
    if (isWriteBackOrCaretOperator(context)) {
      // Skip any = that precedes the expression, there is no need
      // to include = in the AST, it is not important for the editor.
      context.tokens.moveToNextToken();
      this._operationType = OperationType.EndOfExpression;
      return;
    }

    const currentOperator = new TokenOperatorImpl(this._operands.length === 0);
    currentOperator.parse(context, undefined);

    const isUnary = currentOperator.unary;
    this._operationType = isUnary ? OperationType.UnaryOperator : OperationType.BinaryOperator;
    this.handleOperatorPrecedence(context, currentOperator);
  }

  private handleOperatorPrecedence(context: ParseContext, currentOperator: OperatorImpl): void {
    const lastOperator = this.getLastOperator();

    if (
      currentOperator.precedence < lastOperator.precedence ||
      (currentOperator.precedence === lastOperator.precedence && currentOperator.associativity === Associativity.Left)
    ) {
      // New operator has lower or equal precedence. We need to make a tree from
      // the topmost operator and its operand(s). Example: a*b+c. + has lower priority
      // and a and b should be on the stack along with * on the operator stack.
      // Repeat until there are no more higher precendece operators on the stack.
      this.processHigherPrecendenceOperators(context, currentOperator);
    }

    if (this._errorType === ParseErrorType.None) {
      this._operators.push(currentOperator);
    }
  }

  private processHigherPrecendenceOperators(context: ParseContext, currentOperator: Operator): void {
    if (this._operators.length < 2) {
      throw new Error('Parser: expects at least two operators on the stack.');
    }
    const associativity = currentOperator.associativity;
    let nextOperatorNode = this._operators[this._operators.length - 1];

    // At least one operator above sentinel is on the stack.
    do {
      // If associativity is right, we stop if the next operator
      // on the stack has lower or equal precedence than the current one.
      // Example: in 'a^b^c' before pushing last ^ on the stack
      // only b^c is processed since a^b^c = a^(b^c).
      if (associativity === Associativity.Right && nextOperatorNode.precedence <= currentOperator.precedence) {
        break;
      }

      this._errorType = this.makeNode(context);
      if (this._errorType === ParseErrorType.None) {
        nextOperatorNode = this._operators[this._operators.length - 1];

        // If associativity is left, we stop if the next operator
        // on the stack has lower precedence than the current one.
        // Example: in 'a+b*c*d+e' before pushing last + on the stack
        // we need to make subtree out of b*c*d.
        if (associativity === Associativity.Left && nextOperatorNode.precedence < currentOperator.precedence) {
          break;
        }
      }
    } while (this._operators.length > 1 && this._errorType === ParseErrorType.None);
  }

  // Constructs AST node from operator (root) and one or two operands.
  // In order for the node to be successfully created stacks must contain
  // an operator and, depending on the operator, one or two operands.

  // The newly created subtree (operator and root and operands are children)
  // is then pushed into the operands stack. Example: in a*b+c before '+'
  // can be processed, a*b is turned into an subtree and pushed as an operand
  // to the operands stack. Then new subtree can be created with + at the root
  // and 'c' and 'a*b' as its child nodes.

  private makeNode(context: ParseContext): ParseErrorType {
    const operatorNode = this._operators.pop()!;

    const rightOperand = this.safeGetOperand(operatorNode);
    if (!rightOperand) {
      // Oddly, no operands
      context.addError(new UnexpectedItemError(ParseErrorType.LeftOperandExpected, operatorNode));
      return ParseErrorType.LeftOperandExpected;
    }

    if (operatorNode.unary) {
      operatorNode.appendChild(rightOperand);
      operatorNode.rightOperand = rightOperand;
    } else {
      const leftOperand = this.safeGetOperand(operatorNode);
      if (!leftOperand) {
        context.addError(new UnexpectedItemError(ParseErrorType.LeftOperandExpected, operatorNode));
        return ParseErrorType.LeftOperandExpected;
      }

      if (leftOperand.end <= operatorNode.start && rightOperand.start >= operatorNode.end) {
        operatorNode.leftOperand = leftOperand;
        operatorNode.rightOperand = rightOperand;

        operatorNode.appendChild(leftOperand);
        operatorNode.appendChild(rightOperand);
      } else {
        context.addError(new UnexpectedItemError(ParseErrorType.UnexpectedToken, context.currentToken));
        return ParseErrorType.UnexpectedToken;
      }
    }

    this._operands.push(operatorNode);
    return ParseErrorType.None;
  }

  private safeGetOperand(operatorNode: Operator): AstNode | undefined {
    if (!operatorNode.unary) {
      return this._operands.length > 0 ? this._operands.pop() : undefined;
    }
    // if(operatorNode.type === OperatorType.Writeback) {
    // ! applied to the left, like indexer or a function call
    // in high hever languages. I.e. r3! is about the same as
    // a[] or b() where [] is indexing operator and () is a call.
    // return this.safeGetLeftOperand(operatorNode);
    // }
    return this.safeGetRightOperand(operatorNode);
  }

  // private safeGetLeftOperand(operatorNode: Operator): AstNode | undefined {
  //   // Operand is on top the stack and must be to the left of the operator
  //   if (this._operands.length > 0) {
  //     if (this._operands[this._operands.length - 1].end <= operatorNode.start) {
  //       return this._operands.pop();
  //     }
  //   }
  //   return;
  // }

  private safeGetRightOperand(operatorNode: Operator): AstNode | undefined {
    // Operand is on top the stack and must be to the right of the operator
    if (this._operands.length > 0) {
      if (this._operands[this._operands.length - 1].start >= operatorNode.end) {
        return this._operands.pop();
      }
    }
    return;
  }

  private getOperandErrorRange(context: ParseContext): TextRange {
    if (this._operands.length > 0) {
      const node = this._operands[this._operands.length - 1];
      return node.children.count > 0 ? node.children.getItemAt(0) : node;
    }
    return getErrorRange(context);
  }

  private getOperatorErrorRange(context: ParseContext): TextRange {
    const lastOperator = this.getLastOperator();
    return lastOperator.type !== OperatorType.Sentinel ? lastOperator : getErrorRange(context);
  }

  private getLastOperator(): OperatorImpl {
    return this._operators[this._operators.length - 1];
  }

  private addError(context: ParseContext, error: ParseError): void {
    context.addError(error);
    this._errorType = error.errorType;
  }
}

function getErrorRange(context: ParseContext): TextRange {
  return context.tokens.isEndOfLine() ? context.tokens.previousToken : context.tokens.currentToken;
}

function isWriteBackOrCaretOperator(context: ParseContext): boolean {
  // Very special, basically heuristics. If bang is followed
  // by a comma, or preceded by a symbol or by a closing bracket AND is not
  // followed by a symbol, we consider it writeback. Same for caret,
  // except it is preceded by }. May look into better solutions in the future.
  const text = context.getCurrentTokenText();
  const pt = context.previousToken;
  switch (text) {
    case '!':
      if (
        pt.type === TokenType.CloseBracket ||
        (pt.type === TokenType.Symbol && pt.subType === TokenSubType.Register)
      ) {
        return true;
      }
      break;

    case '^':
      return pt.type === TokenType.CloseCurly;
  }
  return false;
}

function skipAddressOperator(context: ParseContext): void {
  const ct = context.tokens.currentToken;
  if (ct.type === TokenType.Operator && ct.subType === TokenSubType.Noop) {
    const text = context.getCurrentTokenText();
    if (text === '=') {
      context.tokens.moveToNextToken();
    }
  }
}
