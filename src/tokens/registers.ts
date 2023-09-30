// Copyright (c) Mikhail Arkhipov. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import { A64Set } from '../core/languageOptions';
import { Char } from '../text/charCodes';

const _registers32: Set<string> = new Set();
const _registers64: Set<string> = new Set();

export function isRegisterName(text: string, instructionSet: string): boolean {
  if (text.length < 2) {
    return false;
  }
  return instructionSet === A64Set ? isRegister64Name(text) : isRegister32Name(text);
}

function isRegister64Name(text: string): boolean {
  populateRegister64Map();

  const t = text.toUpperCase();
  if (_registers64.has(t)) {
    return true;
  }

  // V* registers may have width specifiers like 'UQXTN Vd.4H, Vn.4S'
  if (t.charCodeAt(0) !== Char.V) {
    return false;
  }

  const periodIndex = t.indexOf('.');
  if (periodIndex > 0) {
    const v = t.substring(0, periodIndex);
    return _registers64.has(v);
  }
  return false;
}

function isRegister32Name(text: string): boolean {
  populateRegister32Map();
  return _registers32.has(text.toUpperCase());
}

function populateRegister32Map(): void {
  if (_registers32.size > 0) {
    return;
  }
  // Predeclared core register names in AArch32 state (including synonyms):
  // https://developer.arm.com/documentation/dui0801/f/Overview-of-AArch32-state/Predeclared-core-register-names-in-AArch32-state
  // R0-R15, A1-A4, V1-V8, SB, IP, SP, LR, PC and APSR

  // Predeclared extension register names in AArch32 state
  // Advanced SIMD quadword, doubleword and single-precision SIMD registers.
  // https://developer.arm.com/documentation/dui0801/f/Overview-of-AArch32-state/Predeclared-extension-register-names-in-AArch32-state
  // Q0-Q15, D0-D15, S0-S31

  let i = 0;
  for (; i < 16; i++) {
    _registers32.add(`R${i}`);
    _registers32.add(`Q${i}`);
    _registers32.add(`D${i}`);
    _registers32.add(`S${i}`);
  }

  for (; i < 32; i++) {
    _registers32.add(`S${i}`);
  }

  for (i = 0; i < 4; i++) {
    _registers32.add(`A${i}`);
    _registers32.add(`V${i}`);
  }
  for (; i < 8; i++) {
    _registers32.add(`V${i}`);
  }
  _registers32.add('SB');
  _registers32.add('IP');
  _registers32.add('SP');
  _registers32.add('LR');
  _registers32.add('PC');
  _registers32.add('APSR');
  // FP not listed, but appeas that it is used...
  _registers32.add('FP');
}

function populateRegister64Map(): void {
  if (_registers64.size > 0) {
    return;
  }
  // Predeclared core register names in AArch64 state
  // https://developer.arm.com/documentation/dui0801/f/Overview-of-AArch64-state/Predeclared-core-register-names-in-AArch64-state
  // W0-W30, X0-X30, WZR, XZR, WSP, SP, LR

  // Predeclared extension register names in AArch64 state
  // https://developer.arm.com/documentation/dui0801/f/Overview-of-AArch64-state/Predeclared-extension-register-names-in-AArch64-state
  // Q0-Q31, V0-V31, D0-D31, S0-S31, H0-H31, B0-B31

  // Exception link registers
  // https://developer.arm.com/documentation/dui0801/f/Overview-of-AArch64-state/Link-registers
  // ELR_EL1, ELR_EL2, and ELR_EL3

  for (let i = 0; i < 31; i++) {
    _registers64.add(`W${i}`);
    _registers64.add(`X${i}`);
  }

  for (let i = 0; i < 32; i++) {
    _registers64.add(`B${i}`);
    _registers64.add(`D${i}`);
    _registers64.add(`H${i}`);
    _registers64.add(`S${i}`);
    _registers64.add(`Q${i}`);
    _registers64.add(`V${i}`);
  }
  _registers64.add('WZR');
  _registers64.add('XZR');
  _registers64.add('WSP');
  _registers64.add('SP');
  _registers64.add('LR');

  _registers64.add('ELR_EL1');
  _registers64.add('ELR_EL2');
  _registers64.add('ELR_EL3');
}
