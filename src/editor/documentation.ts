// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as asmInstuctions from "../arm-instructions.json";

import { HttpClient } from "typed-rest-client/HttpClient";
import { MarkdownString } from "vscode";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TurndownService = require("turndown");

export async function getDirectiveDocumentation(
  directiveName: string
): Promise<MarkdownString | undefined> {
  // TODO: caching
  const baseUrl = "https://sourceware.org/binutils/docs/as";
  directiveName = directiveName.replace("_", "_005");
  directiveName = `${directiveName
    .charAt(1)
    .toUpperCase()}${directiveName.substring(2)}`;
  const docUrl = `${baseUrl}/${directiveName}.html`;

  try {
    const client = new HttpClient("vscode-arm");
    const response = await client.get(docUrl);
    if (response.message.statusCode !== 200) {
      return;
    }

    const content = await response.readBody();
    const turndownService = new TurndownService();
    const markdown = turndownService.turndown(content);
    return markdown;
  // eslint-disable-next-line no-empty
  } catch {}
}

export function getInstructionDocumentation(
  instructionName: string
): MarkdownString | undefined {
  const props = asmInstuctions.instructions[instructionName.toLowerCase()];
  if (props) {
    const arch = props.arch.length > 0 ? props.arch : "All";
    const docUrl = getInstructionDocumentationUrl(instructionName);
    return new MarkdownString(`${props.desc}\n\n(CPU: ${arch})\n\n[Documentation](${docUrl})`);
  }
}

export function getInstructionDocumentationUrl(
  instructionName: string
): string | undefined {
  const props = asmInstuctions.instructions[instructionName];
  if (props) {
    const baseUrl = "https://developer.arm.com/documentation/dui0473/m/arm-and-thumb-instructions";
    const docUrl = `${baseUrl}/${props.docName ? props.docName : instructionName}`;
    return docUrl;
  }
}
