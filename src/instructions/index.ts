// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

// Extract information on instructions from ARM XHTML files
// available at https://developer.arm.com/downloads/-/exploration-tools.

// This is bit of a hack. Each file is an HTML document for display,
// not really an API-level thing with known structure. Let's hope
// format stays stable.

// Each file has section like this:
// <h2 class="instruction-section">CRC32C</h2>
// where we can fetch the instruction name. Unfortunately, file names
// do not always follow instruction names. Sometimes section content
// is a bit more complicated, but it seems like instruction name
// is always in uppercase and doc sometimes applies to more than one
// instruction.

// Next paragraph contains useful description that is good for
// display in hover tooltip. Second paragraph often information
// on which architecture includes the instruction as optional
// or mandatory. Sometimes information is on a different
// subject, but nevertheless useful.

// So we are going to go through every file in the doc folder,
// load HTML, parse it and fetch information on instructions.
// Then we persist the info into less convoluted format that
// we will be using at runtime.

import * as fs from 'fs';
import * as path from 'path';

import { HTMLElement, parse } from 'node-html-parser';
import { outputMessage } from '../core/utility';
import { Character } from '../text/charCodes';
import { A64Set } from '../core/languageOptions';

// Add command to package.json to expose this. Uncomment command
// registration in extension.ts.

// {
//   "command": "arm.convertHtmlToIndex",
//   "title": "Convert ARM HTML instruction documentation to index file",
//   "category": "ARM",
//   "icon": {
//     "light": "images/ArmIcon.png",
//     "dark": "images/ArmIcon.png"
//   }
// }

// const armHtmlDocFolderName = '~\\ARM\\ISA_AArch32_xml_A_profile-2023-06\\xhtml';
// const armHtmlDocFolderName = '~\\ARM\\ISA_A64_xml_A_profile-2023-06\\xhtml';
const armHtmlDocFolderName = '~\\ARM\\test';
const indexFolderName = 'D:\\vscode-arm';
const setFileName = `${A64Set}.json`;

interface InstructionData {
  name: string;
  doc: string;
}

export function convertHtmlToIndex(): void {
  const entries = fs.readdirSync(armHtmlDocFolderName);
  const instructions: Map<string, InstructionData> = new Map();

  entries.forEach((e) => {
    if (e.endsWith('.html')) {
      const id = convertOne(path.join(armHtmlDocFolderName, e));
      id.forEach((e) => {
        if (id && !instructions.has(e.name)) {
          instructions.set(e.name, e);
        }
      });
    }
  });
  // Write the result as JSON
  writeToJson(Array.from(instructions.values()));
}

function convertOne(fileName: string): InstructionData[] {
  try {
    const contents = fs.readFileSync(fileName, 'utf-8');
    return getInstructionDataFromHtml(fileName, contents);
  } catch (e) {
    outputMessage(`Unable to convert ${fileName}. Error ${e.message}`);
  }
  return [];
}

function getInstructionDataFromHtml(fileName: string, contents: string): InstructionData[] {
  const root = parse(contents);
  const instSection = root.querySelector('.instruction-section');
  if (!instSection) {
    // Probably not an instruction doc file.
    // outputMessage(`Unable to find '.instruction-section' in ${fileName}.`);
    return [];
  }
  // Grok instruction name(s). Fetch all uppercase, then split into words.
  const text = instSection.innerText.trim();
  const instrNames: string[] = [];
  let name: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i);
    const code = ch.charCodeAt(0);

    if (Character.isLowercaseAnsiLetter(code)) {
      // As soon as we see non-uppercase, we are done.
      break;
    }

    if (Character.isUppercaseAnsiLetter(code)) {
      name.push(ch);
    } else {
      if (name.length > 0) {
        instrNames.push(name.join(''));
        name = [];
      }
    }
  }

  if (name.length > 0) {
    instrNames.push(name.join(''));
  }

  const result: InstructionData[] = [];
  const doc = getDoc(instSection);
  if (doc) {
    instrNames.forEach((e) => {
      result.push({
        name: e,
        doc,
      });
    });
  } else {
    outputMessage(`Unable to instruction information in ${fileName}. No sibling for '.instruction-section'`);
  }
  return result;
}

function getDoc(instSection: HTMLElement): string | undefined {
  let doc: string | undefined;
  // Now fetch two paragraphs following the '.instruction-section'.
  const p1 = instSection.nextElementSibling;
  if (p1) {
    doc = p1.innerText.trim();

    // only take '.aml' class
    const p2 = p1.nextElementSibling;
    if (p2 && p2.tagName === 'p' && p2.getAttribute('class') === '.aml') {
      const doc2 = p2?.innerText?.trim();
      if (doc2 && doc2.length > 0) {
        doc = (doc + `\n\n${doc2}`).trim();
      }
    }
    doc = cleanDoc(doc);
  }
  return doc;
}

function cleanDoc(doc: string): string {
  // Little heuristics.
  if (doc.endsWith('This means:')) {
    doc = doc.substring(0, doc.length - 11).trim();
  }
  if (doc.endsWith('See also')) {
    doc = doc.substring(0, doc.length - 8).trim();
  }
  return doc;
}

function writeToJson(data: InstructionData[]): void {
  const fileName = path.join(indexFolderName, setFileName);
  try {
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(fileName, json);
  } catch (e) {
    outputMessage(`Unable to instruction information in ${fileName}. No sibling for '.instruction-section'`);
  }
}
