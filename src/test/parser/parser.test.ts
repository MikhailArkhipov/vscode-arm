// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { parseText } from "../utility/parsing";

test('Empty string', () => {
  const root = parseText('');
  expect(root).toBeDefined();
  expect(root.children.count).toBe(0);
  expect(root.parent).toBe(root);
});
