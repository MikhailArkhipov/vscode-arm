// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { LanguageOptions } from "../core/languageOptions";
import { Settings, getSetting } from "../core/settings";

// GCC/GAS:
//   https://sourceware.org/binutils/docs/as/
//   https://developers.redhat.com/blog/2021/02/26/tips-for-writing-portable-assembler-with-gnu-assembler-gas

export function getLanguageOptions(): LanguageOptions {
  return {
      lineCommentChar: '@', // Line comments start with @
      cLineComments: true, // Allow C++ style line comments i.e. //
      cBlockComments: true, // Allow C block comments /* */
      // GNU-specific.
      hashComments: true,
      colonInLabels: true,
      reservedRegisterNames: getSetting<boolean>(Settings.reservedRegisterNames, true),
      isA64: getSetting<string>(Settings.instructionSet, 'A64') === 'A64',
  };
}