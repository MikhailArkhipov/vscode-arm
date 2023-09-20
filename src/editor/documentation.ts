// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { HttpClient } from 'typed-rest-client/HttpClient';
import { MarkdownString } from 'vscode';
import { TextRange } from '../text/textRange';
import { Instruction, parseInstruction } from '../instructions/instruction';
import { getInstructionSet } from '../instructions/instructionSet';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TurndownService = require('turndown');
let turndownService: any;

// Fetches GAS/GCC directive docs from online source.
export async function getDirectiveDocumentation(directiveName: string): Promise<MarkdownString | undefined> {
  // TODO: caching
  const baseUrl = 'https://sourceware.org/binutils/docs/as';
  directiveName = directiveName.replace('_', '_005');
  directiveName = `${directiveName.charAt(1).toUpperCase()}${directiveName.substring(2)}`;
  const docUrl = `${baseUrl}/${directiveName}.html`;

  try {
    const client = new HttpClient('vscode-arm');
    const response = await client.get(docUrl);
    if (response.message.statusCode !== 200) {
      return;
    }

    const content = await response.readBody();
    turndownService = turndownService ?? new TurndownService();
    const markdown = turndownService.turndown(content);
    return markdown;
    // eslint-disable-next-line no-empty
  } catch {}
}

export async function getInstructionDocumentation(instructionName: string): Promise<MarkdownString | undefined> {
  const pi = await parseInstruction(instructionName, TextRange.fromBounds(0, 0));
  if (pi.name && pi.name.length > 0) {
    const docUrl = getInstructionDocumentationUrl(pi);
    if(pi.architecture && pi.architecture.length > 0) {
      return new MarkdownString(`${pi.description}\n\n(CPU: ${pi.architecture})\n\n[Documentation](${docUrl})`);
    }
    return new MarkdownString(`${pi.description}\n\n[Documentation](${docUrl})`);
  }
}

export function getInstructionDocumentationUrl(instruction: Instruction): string | undefined {
  const set = getInstructionSet(instruction.instructionSet);
  if (set && set.docUrl && set.docUrl.length > 0) {
    return `${set.docUrl}/${instruction.docName ? instruction.docName : instruction.name}`;
  }
}
