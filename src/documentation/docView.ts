// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { ViewColumn, WebviewPanel, window } from 'vscode';
import { Disposable } from 'vscode';

export class DocView implements Disposable {
    public static currentPanel: DocView | undefined;
    public static readonly viewType = 'instructionDoc';
    private disposables: Disposable[] = [];

    public static createOrShow(content: string) {
        const viewColumn = DocView.getViewColumn();
        // If we already have a panel, show it.
        if (DocView.currentPanel) {
          DocView.currentPanel.panel.reveal(viewColumn, true);
        } else {
          const panel = window.createWebviewPanel(DocView.viewType, 'ARM Documentation', {
              viewColumn,
              preserveFocus: true,
          });
          DocView.currentPanel = new DocView(panel);
        }  
        DocView.currentPanel.panel.webview.html = content;
      }

    public static revive(panel: WebviewPanel) {
      DocView.currentPanel = new DocView(panel);
    }

    private constructor(private readonly panel: WebviewPanel) {
        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programatically
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    public dispose() {
      DocView.currentPanel = undefined;
        // Clean up our resources
        this.panel.dispose();
        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private static getViewColumn(): ViewColumn {
        const column = window.activeTextEditor ? window.activeTextEditor.viewColumn : ViewColumn.One;
        switch (column) {
            case ViewColumn.One:
                return ViewColumn.Two;
            case ViewColumn.Two:
                return ViewColumn.Three;
            case ViewColumn.Three:
                return ViewColumn.Four;
            case ViewColumn.Four:
                return ViewColumn.Five;
        }
        return ViewColumn.One;
    }
}
