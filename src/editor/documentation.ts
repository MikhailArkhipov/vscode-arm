// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { HttpClient } from "typed-rest-client/HttpClient";
import { MarkdownString } from "vscode";

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
  } catch {}
}
