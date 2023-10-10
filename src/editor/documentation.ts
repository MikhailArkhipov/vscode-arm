// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as fs from 'fs';
import * as path from 'path';

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
  try {
    const instruction = getInstructionInfo(instructionName, instructionSet);
    if (!instruction.isValid) {
      return;
    }

    const instructionDocFolder = path.join(__dirname, '..', '..', '..', 'ARM-doc', instructionSet);
    const fsEntries = fs.readdirSync(instructionDocFolder).map((e) => e.toLowerCase());
    // See if there is exact match
    let docFile: string | undefined = `${instruction.name}.html`;
    const index = fsEntries.indexOf(docFile);
    if (index < 0) {
      const prefix = `${instruction.name}_`;
      docFile = fsEntries.find((e) => {
        return e.startsWith(prefix) && e.endsWith('.html');
      });
      if (!docFile) {
        docFile = fsEntries.find((e) => {
          return e.startsWith(instruction.name) && e.endsWith('.html');
        });
      }
    }

    if (docFile) {
      return `file:///${instructionDocFolder.replace('\\', '/')}/${docFile}`;
    }
  } catch (e) {}
  return '';
}
