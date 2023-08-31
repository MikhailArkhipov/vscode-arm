// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { Statement } from "../../AST/statement";
import { TokenNode } from "../../AST/tokenNode";
import { TokenType } from "../../tokens/tokens";
import { TestUtil } from "../utility";

test("Parse empty string", () => {
    var root = TestUtil.parseText("");
    expect(root).toBeDefined();
    expect(root.children.count).toBe(0);
    expect(root.parent).toBe(root);
});

test("Parse label empty statement", () => {
    var root = TestUtil.parseText("label: ");
    expect(root).toBeDefined();
    expect(root.children.count).toBe(1);
    expect(root.parent).toBe(root);

    expect(root.context.errors.count).toBe(0);
    var c1 = root.children.getItemAt(0); 
    expect(c1).toBeInstanceOf(Statement);
    var s = c1 as Statement;
    expect(s.children.count).toBe(1);
    expect(root.text.getText(s.start, s.length)).toBe("label:");
    
    var c2 = s.children.getItemAt(0);
    expect(c2).toBeInstanceOf(TokenNode);
    var tn = c2 as TokenNode;
    expect(tn.children.count).toBe(0);
    expect(tn.token.tokenType).toBe(TokenType.Word);
    expect(root.text.getText(tn.start, tn.length)).toBe("label:");
});
