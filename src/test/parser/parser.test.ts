// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TestUtil } from "../utility";

test("Parse empty string", () => {
    var root = TestUtil.parseText("");
    expect(root).toBeDefined();
    expect(root.children.count).toBe(0);
    expect(root.parent).toBe(root);
});
