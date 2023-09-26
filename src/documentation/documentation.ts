// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { HttpClient } from 'typed-rest-client/HttpClient';
import { CancellationToken, MarkdownString } from 'vscode';
import { parseInstruction } from '../instructions/instruction';
import { waitForInstructionSetLoadingComplete } from '../instructions/instructionSet';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TurndownService = require('turndown');
let turndownService: any;

// Fetches GAS/GCC directive docs from online source.
export async function getDirectiveDocumentation(directiveName: string, ct: CancellationToken): Promise<MarkdownString | undefined> {
  // TODO: caching
  const baseUrl = 'https://sourceware.org/binutils/docs/as';
  directiveName = directiveName.replace('_', '_005');
  directiveName = `${directiveName.charAt(1).toUpperCase()}${directiveName.substring(2)}`;
  const docUrl = `${baseUrl}/${directiveName}.html`;

  try {
    const client = new HttpClient('vscode-arm');
    const response = await client.get(docUrl);
    
    if (ct.isCancellationRequested || response.message.statusCode !== 200) {
      return;
    }

    const content = await response.readBody();
    turndownService = turndownService ?? new TurndownService();
    const markdown = turndownService.turndown(content);
    return markdown;
    // eslint-disable-next-line no-empty
  } catch {}
}

export async function getInstructionDocumentation(instructionName: string, ct: CancellationToken): Promise<MarkdownString | undefined> {
  await waitForInstructionSetLoadingComplete();
  const pi = parseInstruction(instructionName);
  if (pi.name && pi.name.length > 0 && pi.description && pi.description.length > 0) {
    return new MarkdownString(`${pi.name}\n\n${pi.description}`);
  }
}
