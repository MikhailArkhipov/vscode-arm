// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { Statement } from "../../AST/statement";
import { TokenNode } from "../../AST/tokenNode";
import { TestUtil } from "../../test/utility";
import { CommaSeparatedItem, CommaSeparatedList } from "../../AST/commaSeparatedList";
import { AstNode } from "../../AST/astNode";
import { Expression } from "../../AST/expression";
import { Operator } from "../../AST/operator";

test("Empty string", () => {
    const root = TestUtil.parseText("");
    expect(root).toBeDefined();
    expect(root.children.count).toBe(0);
    expect(root.parent).toBe(root);
});

test("Simple expression", () => {
    const root = TestUtil.parseText("a+b");
    let child: AstNode;

    expect(root).toBeDefined();
    expect(root.children.count).toBe(1);

    expect(root.context.errors.count).toBe(0);
    const c1 = root.children.getItemAt(0); 
    expect(c1).toBeInstanceOf(Statement);
    
    const s = c1 as Statement;
    expect(s.children.count).toBe(1);
    child = s.children.getItemAt(0);
    expect(child).toBeInstanceOf(CommaSeparatedList);

    const csl = child as CommaSeparatedList;
    expect(csl.children.count).toBe(1);
    child = csl.children.getItemAt(0);
    expect(child).toBeInstanceOf(CommaSeparatedItem);

    const csi = child as CommaSeparatedItem;
    expect(csi.children.count).toBe(1);
    child = csi.children.getItemAt(0);
    expect(child).toBeInstanceOf(Expression);

    const e = child as Expression;
    expect(e.children.count).toBe(1);
    child = e.children.getItemAt(0);
    expect(child).toBeInstanceOf(Operator);
   
    const op = child as Operator;
    expect(op.children.count).toBe(2);
    expect(op.leftOperand).toBeInstanceOf(TokenNode);
    expect(op.rightOperand).toBeInstanceOf(TokenNode);

    expect(root.text.getText(op.leftOperand!.start, op.leftOperand!.length)).toBe("a");
    expect(root.text.getText(op.rightOperand!.start, op.rightOperand!.length)).toBe("b");
});
