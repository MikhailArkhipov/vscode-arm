// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { TextDocument } from 'vscode';
import { EditorDocument } from './document';

// Running documents table. Tracks active documents by VS Code TextDocument.
export namespace RDT {
  const rdt: Map<TextDocument, EditorDocument> = new Map<TextDocument, EditorDocument>();

  export function addTextDocument(td: TextDocument): void {
    if (!rdt.has(td)) {
      rdt.set(td, new EditorDocument(td));
    }
  }

  export function removeTextDocument(td: TextDocument): void {
    if (rdt.has(td)) {
      rdt.delete(td);
    }
  }

  export function getEditorDocument(td: TextDocument): EditorDocument | undefined {
    return rdt.get(td);
  }

  export function getDocuments(): readonly EditorDocument[] {
    return Array.from(rdt.values());
  }
}
