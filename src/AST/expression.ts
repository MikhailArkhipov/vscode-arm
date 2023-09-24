// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { AstNode, AstNodeImpl } from './astNode';
import { Associativity, Operator, OperatorType } from './operator';
import { TokenNode } from './tokenNode';
import { TextRange } from '../text/textRange';
import { TokenType } from '../tokens/tokens';
import { ParseContext } from '../parser/parseContext';
import { ErrorLocation, ParseError, ParseErrorType } from '../parser/parseError';
import { Group } from './group';

// Heavily based on code in Microsoft RTVS, see
// https://github.com/microsoft/RTVS/blob/master/src/R/Core/Impl/AST/Expressions/ExpressionParser.cs

// Implements shunting yard algorithm of expression parsing.
// https://en.wikipedia.org/wiki/Shunting-yard_algorithm

// Describes current and previous operation types in the current expression.
// Helps to detect errors like missing operands or operators.
const enum OperationType {
  None,
  UnaryOperator,
  BinaryOperator,
  Operand,
  Function,
  EndOfExpression,
}

const sentinel = new Operator(false, OperatorType.Sentinel);

interface ParseResult {
  operationType: OperationType;
  errorType: ParseErrorType;
}

export class Expression extends AstNodeImpl {
  private _content: AstNode | undefined;

  public get content(): AstNode | undefined {
    return this._content;
  }

  // https://en.wikipedia.org/wiki/Shunting-yard_algorithm
  private readonly _operands: TokenNode[] = [];
  private readonly _operators: Operator[] = [];
  private _previousOperationType = OperationType.None;

  public parse(context: ParseContext, parent: AstNode | undefined) {
    // http://www.engr.mun.ca/~theo/Misc/exp_parsing.htm
    // Instead of evaluating expressions like calculator would do,
    // we create tree nodes with operator and its operands.

    const tokens = context.tokens;
    let currentOperationType = OperationType.None;
    let errorType = ParseErrorType.None;
    let errorLocation = ErrorLocation.AfterToken;
    let endOfExpression = false;
    let result: ParseResult;

    // Push sentinel
    this._operators.push(sentinel);
    while (!tokens.isEndOfLine() && errorType === ParseErrorType.None && !endOfExpression) {
      const ct = tokens.currentToken;

      switch (ct.type) {
        // Terminal constants
        case TokenType.Number:
        case TokenType.String:
        case TokenType.Symbol:
          currentOperationType = this.handleTokenOperand(context);
          break;

        // Nested expression such as a*(b+c) or a nameless
        // function call like a[2](x, y) or func(a, b)(c, d)
        case TokenType.OpenBrace:
          result = this.handleGroup(context);
          currentOperationType = result.operationType;
          errorType = result.errorType;
          break;

        case TokenType.Operator:
          result = this.handleOperator(context);
          currentOperationType = result.operationType;
          errorType = result.errorType;
          break;

        case TokenType.Comma:
        case TokenType.CloseBrace:
        case TokenType.CloseCurly:
        case TokenType.CloseBracket:
          currentOperationType = OperationType.EndOfExpression;
          endOfExpression = true;
          break;

        default:
          // Nesting of comma-separated lists is not allowed.
          // Assembler allows 'pop {r1, r0}', 'ADR r12, {pc}+8', ldr r0, [pc, #-0],
          // but pop {r1, {...}} or 'mov r12, [sp + []]' are illegal.
          // Hence we are not handling opening [ or { here
          errorType = ParseErrorType.UnexpectedToken;
          errorLocation = ErrorLocation.Token;
          break;
      }

      if (errorType === ParseErrorType.None && !this.isConsistentOperationSequence(context, currentOperationType)) {
        return false;
      }

      if (errorType !== ParseErrorType.None || endOfExpression) {
        break;
      }

      this._previousOperationType = currentOperationType;
    }

    if (errorType !== ParseErrorType.None) {
      if (errorLocation === ErrorLocation.AfterToken) {
        context.addError(new ParseError(errorType, ErrorLocation.AfterToken, tokens.previousToken));
      } else {
        context.addError(new ParseError(errorType, ErrorLocation.Token, tokens.currentToken));
      }
    }

    if (this._operators.length > 1) {
      // If there are still operators to process, construct the final subtree.
      // After that only the sentinel operator should be in the operators stack
      // and a single final root node in the operand stack.
      errorType = this.processHigherPrecendenceOperators(context, sentinel);
    }

    if (errorType !== ParseErrorType.None) {
      if (errorType !== ParseErrorType.OperandExpected) {
        context.addError(new ParseError(errorType, ErrorLocation.Token, this.getErrorRange(context)));
      }

      // Although there may be errors we still want to include the result into the tree
      if (this._operands.length === 1) {
        this._content = this._operands.pop()!;
        this.appendChild(this._content);
      }
    } else {
      if (this._operators.length !== 1) {
        throw new Error('Expression parser: inconsistent operator stack.');
      }
      // If operand stack is empty and there is no error then the expression is empty.
      if (this._operators.length > 0) {
        this._content = this._operands.pop()!;
        this.appendChild(this._content);
      }
    }
    return true;
  }

  private isConsistentOperationSequence(context: ParseContext, currentOperationType: OperationType): boolean {
    // Binary operator followed by another binary like 'a +/ b' is an error.
    // Binary operator without anything behind it is an error;
    if (
      (this._previousOperationType === OperationType.Function && currentOperationType === OperationType.Operand) ||
      (this._previousOperationType === currentOperationType && currentOperationType !== OperationType.Function)
    ) {
      switch (currentOperationType) {
        case OperationType.Operand:
          // 'operand operand' sequence is an error
          context.addError(
            new ParseError(ParseErrorType.OperatorExpected, ErrorLocation.Token, this.getOperandErrorRange(context))
          );
          break;

        case OperationType.UnaryOperator:
          // 'unary unary' and 'binary unary' are OK
          return true;

        default:
          // 'operator operator' sequence is an error
          context.addError(
            new ParseError(ParseErrorType.OperandExpected, ErrorLocation.Token, this.getOperatorErrorRange(context))
          );
          break;
      }

      return false;
    }
    if (currentOperationType === OperationType.BinaryOperator && context.tokens.isEndOfLine()) {
      // 'operator <EOF>' sequence is an error
      context.addError(
        new ParseError(ParseErrorType.OperandExpected, ErrorLocation.Token, this.getOperatorErrorRange(context))
      );
      return false;
    }
    if (
      this._previousOperationType === OperationType.UnaryOperator &&
      currentOperationType === OperationType.BinaryOperator
    ) {
      // unary followed by binary doesn't make sense
      context.addError(
        new ParseError(ParseErrorType.SymbolExpected, ErrorLocation.Token, this.getOperatorErrorRange(context))
      );
      return false;
    }
    if (
      this._previousOperationType === OperationType.BinaryOperator &&
      currentOperationType === OperationType.EndOfExpression
    ) {
      // missing list selector: z$ }
      context.addError(
        new ParseError(ParseErrorType.OperandExpected, ErrorLocation.Token, this.getErrorRange(context))
      );
      return false;
    }

    return true;
  }

  private handleTokenOperand(context: ParseContext): OperationType {
    const constant = TokenNode.create(context, this);
    this._operands.push(constant);
    return OperationType.Operand;
  }

  private handleGroup(context: ParseContext): ParseResult {
    const group = new Group();
    group.parse(context, this);
    this._operands.push(group);
    return { operationType: OperationType.Operand, errorType: ParseErrorType.None };
  }

  private handleOperator(context: ParseContext): ParseResult {
    const currentOperator = new Operator(this._operands.length === 0);
    currentOperator.parse(context, undefined);

    const isUnary = currentOperator.unary;
    const operationType = isUnary ? OperationType.UnaryOperator : OperationType.BinaryOperator;
    const errorType = this.handleOperatorPrecedence(context, currentOperator);

    return { operationType, errorType };
  }

  private handleOperatorPrecedence(context: ParseContext, currentOperator: Operator): ParseErrorType {
    let errorType = ParseErrorType.None;
    const lastOperator = this._operators[this._operators.length - 1];

    if (
      currentOperator.precedence < lastOperator.precedence ||
      (currentOperator.precedence === lastOperator.precedence && currentOperator.associativity === Associativity.Left)
    ) {
      // New operator has lower or equal precedence. We need to make a tree from
      // the topmost operator and its operand(s). Example: a*b+c. + has lower priority
      // and a and b should be on the stack along with * on the operator stack.
      // Repeat until there are no more higher precendece operators on the stack.
      errorType = this.processHigherPrecendenceOperators(context, currentOperator);
    }

    if (errorType === ParseErrorType.None) {
      this._operators.push(currentOperator);
    }

    return errorType;
  }

  private processHigherPrecendenceOperators(context: ParseContext, currentOperator: Operator): ParseErrorType {
    if (this._operators.length < 2) {
      throw new Error('Parser: expects at least two operators on the stack.');
    }
    let errorType = ParseErrorType.None;
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

      errorType = this.makeNode(context);
      if (errorType === ParseErrorType.None) {
        nextOperatorNode = this._operators[this._operators.length - 1];

        // If associativity is left, we stop if the next operator
        // on the stack has lower precedence than the current one.
        // Example: in 'a+b*c*d+e' before pushing last + on the stack
        // we need to make subtree out of b*c*d.
        if (associativity === Associativity.Left && nextOperatorNode.precedence < currentOperator.precedence) {
          break;
        }
      }
    } while (this._operators.length > 1 && errorType === ParseErrorType.None);

    return errorType;
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
      return ParseErrorType.OperandExpected;
    }

    if (operatorNode.unary) {
      operatorNode.appendChild(rightOperand);
      operatorNode.rightOperand = rightOperand;
    } else {
      const leftOperand = this.safeGetOperand(operatorNode);
      if (!leftOperand) {
        context.addError(new ParseError(ParseErrorType.OperandExpected, ErrorLocation.Token, context.currentToken));
        return ParseErrorType.OperandExpected;
      }
      if (leftOperand.end <= operatorNode.start && rightOperand.start >= operatorNode.end) {
        operatorNode.leftOperand = leftOperand;
        operatorNode.rightOperand = rightOperand;

        operatorNode.appendChild(leftOperand);
        operatorNode.appendChild(rightOperand);
      } else {
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
    return this.safeGetRightOperand(operatorNode);
  }

  private safeGetLeftOperand(operatorNode: Operator): AstNode | undefined {
    // Operand is on top the stack and must be to the left of the operator
    if (this._operands.length > 0) {
      if (this._operands[this._operands.length - 1].end <= operatorNode.start) {
        return this._operands.pop();
      }
    }
    return;
  }

  private safeGetRightOperand(operatorNode: Operator): AstNode | undefined {
    // Operand is on top the stack and must be to the right of the operator
    if (this._operands.length > 0) {
      if (this._operands[this._operands.length - 1].start >= operatorNode.end) {
        return this._operands.pop();
      }
    }
    return;
  }

  private getErrorRange(context: ParseContext): TextRange {
    return context.tokens.isEndOfLine() ? context.tokens.previousToken : context.tokens.currentToken;
  }

  private getOperandErrorRange(context: ParseContext): TextRange {
    if (this._operands.length > 0) {
      const node = this._operands[this._operands.length - 1];
      return node.children.count > 0 ? node.children.getItemAt(0) : node;
    }
    return this.getErrorRange(context);
  }

  private getOperatorErrorRange(context: ParseContext): TextRange {
    if (this._operators.length > 0) {
      const node = this._operators[this._operands.length - 1];
      return node.children.count > 0 ? node.children.getItemAt(0) : node;
    }
    return this.getErrorRange(context);
  }
}