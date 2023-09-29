// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

export function makeWhitespace(amount: number): string {
  return new Array(amount + 1).join(' ');
}
