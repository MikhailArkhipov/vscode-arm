// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { HttpClient } from 'typed-rest-client/HttpClient';
import { CancellationToken, MarkdownString } from 'vscode';
import { getInstructionInfo } from '../AST/instructionInfo';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TurndownService = require('turndown');
let turndownService: any;

export function getDirectiveDocumentationUrl(directiveName: string): string {
  const baseUrl = 'https://sourceware.org/binutils/docs/as';
  directiveName = directiveName.replace('_', '_005');
  directiveName = `${directiveName.charAt(1).toUpperCase()}${directiveName.substring(2)}`;
  return `${baseUrl}/${directiveName}.html`;
}

// Fetches GAS/GCC directive docs from online source.
export async function getDirectiveDocumentation(
  directiveName: string,
  ct: CancellationToken
): Promise<MarkdownString | undefined> {
  const docUrl = getDirectiveDocumentationUrl(directiveName);

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

export function getInstructionDocumentationUrl(instructionName: string, instructionSet: string): string | undefined {
  const instruction = getInstructionInfo(instructionName, instructionSet);
  return instruction.isValid
    ? `https://mikhailarkhipov.github.io/ARM-doc/${instructionSet}/${instruction.file}`
    : undefined;
}
