// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { Statement } from "../../AST/statement";
import { TokenNode } from "../../AST/tokenNode";
import { TokenType } from "../../tokens/tokens";
import { TestUtil } from "../../test/utility";

test("Empty string", () => {
    const root = TestUtil.parseText("");
    expect(root).toBeDefined();
    expect(root.children.count).toBe(0);
    expect(root.parent).toBe(root);
});

test("Label + empty statement", () => {
    const root = TestUtil.parseText("label: ");
    expect(root).toBeDefined();
    expect(root.children.count).toBe(1);
    expect(root.parent).toBe(root);

    expect(root.context.errors.count).toBe(0);
    const c1 = root.children.getItemAt(0); 
    expect(c1).toBeInstanceOf(Statement);
    const s = c1 as Statement;
    expect(s.children.count).toBe(1);
    expect(root.text.getText(s.start, s.length)).toBe("label:");
    
    const c2 = s.children.getItemAt(0);
    expect(c2).toBeInstanceOf(TokenNode);
    const tn = c2 as TokenNode;
    expect(tn.children.count).toBe(0);
    expect(tn.token.type).toBe(TokenType.Label);
    expect(root.text.getText(tn.start, tn.length)).toBe("label:");
});
