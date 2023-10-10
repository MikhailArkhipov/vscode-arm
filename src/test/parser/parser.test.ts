// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { createAstAsync } from "../utility/parsing";

test('Empty string', async () => {
  const root = await createAstAsync('');
  expect(root).toBeDefined();
  expect(root.children.count).toBe(0);
  expect(root.parent).toBe(root);
});
