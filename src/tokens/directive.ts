// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

const variableDeclarations = new Set<string>([
  '.ascii',
  '.asciz',
  '.byte',
  '.double',
  '.fill',
  '.float',
  '.hword',
  '.int',
  '.long',
  '.octa',
  '.quad',
  '.short',
  '.single',
  '.skip',
  '.space',
  '.string',
  '.word',
  '.zero',
]);

// Similar to #define in C
const symbolDefinitions = new Set<string>(['.equ', '.eqv', '.equiv', '.set']);

export namespace Directive {
  export function isDeclaration(text: string): boolean {
    return variableDeclarations.has(text.toLowerCase());
  }  
  export function isDefinition(text: string): boolean {
    return symbolDefinitions.has(text.toLowerCase());
  }
}
