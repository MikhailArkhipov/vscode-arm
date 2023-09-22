// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

const dataDeclarations = new Set<string>([
  '.ascii',
  '.asciiz',
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

const symbolDefinitions = new Set<string>(['.equ', '.eqv', '.equiv']);

export namespace Directive {
  export function isDataDeclaration(text: string): boolean {
    return dataDeclarations.has(text);
  }  
  export function isSymbolDefinition(text: string): boolean {
    return symbolDefinitions.has(text);
  }
}
