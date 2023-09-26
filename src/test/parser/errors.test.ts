// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { parseExpression } from "./parseUtility";

test('+', () => {
  const result = parseExpression('+');
  const context = result.context;

  expect(context.errors.count).toBe(1);
});