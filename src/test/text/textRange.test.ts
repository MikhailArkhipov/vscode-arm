// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextRange } from "../../text/textRange";

test("TextRanges union", () => {
    const range1 = TextRange.create(10, 2);
    const range2 = TextRange.create(12, 2);

    const combined = TextRange.union(range1.start, range1.length, range2.start, range2.length);

    expect(combined).toBeDefined();
    expect(combined.start).toBe(10);
    expect(combined.length).toBe(4);

    // Ensure input ranges are unchanged
    expect(range1.start).toBe(10);
    expect(range1.length).toBe(2);
    expect(range2.start).toBe(12);
    expect(range2.length).toBe(2);
});
