// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { createAst } from '../utility/parsing';

test('Empty string', () => {
  const root = createAst('');
  expect(root).toBeDefined();
  expect(root.children.count).toBe(0);
  expect(root.parent).toBe(root);
});
