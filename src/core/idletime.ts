// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { CancellationToken, CancellationTokenSource } from 'vscode';
import { RDT } from '../editor/rdt';

let cts = new CancellationTokenSource();

export namespace IdleTime {
  export function notifyEditorTextChanged(): void {
    cts.cancel();
    cts = new CancellationTokenSource();
    setTimeout(() => {
      doIdle(cts.token);
    }, 500);
  }

  function doIdle(ct: CancellationToken): void {
    const documents = RDT.getDocuments();
    for (let i = 0; i < documents.length && !ct.isCancellationRequested; i++) {
      documents[i].onIdle(ct);
    }
  }
}
