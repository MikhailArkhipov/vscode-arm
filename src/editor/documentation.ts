// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import https = require('https');
import { CancellationToken, MarkdownString } from 'vscode';
import { getInstructionInfo } from '../AST/instructionInfo';
import { createDeferred } from '../core/deferred';

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
  const deferred = createDeferred<MarkdownString | undefined>();
  try {
    https.get(docUrl, (response) => {
      if (ct.isCancellationRequested || response.statusCode !== 200) {
        deferred.resolve();
      }
      let data = '';
      response
        .on('data', (chunk) => {
          data += chunk;
        })
        .on('close', () => {
          turndownService = turndownService ?? new TurndownService();
          const markdown = turndownService.turndown(data);
          deferred.resolve(markdown);
        });
    });
    // eslint-disable-next-line no-empty
  } catch {
    deferred.reject();
  }
  return deferred.promise;
}

export function getInstructionDocumentationUrl(instructionName: string, instructionSet: string): string | undefined {
  const instruction = getInstructionInfo(instructionName, instructionSet);
  return instruction.isValid
    ? `https://mikhailarkhipov.github.io/ARM-doc/${instructionSet}/${instruction.file}`
    : undefined;
}
