// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as vscode from 'vscode';
import { TextDocument } from "vscode";
import { AstRoot } from "../AST/astRoot";
import { Parser } from "../parser/parser";
import { SyntaxConfig, AssemblerType } from "../syntaxConfig";
import { TextStream } from "../text/textStream";

const diagnostics = vscode.languages.createDiagnosticCollection('vscode-arm');



export function updateDiagnostics(e: vscode.TextEditor) {

}


