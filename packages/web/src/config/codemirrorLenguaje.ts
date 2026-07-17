import { StreamLanguage } from '@codemirror/language';
import { kotlin } from '@codemirror/legacy-modes/mode/clike';
import { swift } from '@codemirror/legacy-modes/mode/swift';

/** Extensión de resaltado de CodeMirror para el lenguaje del juez. */
export function extensionLenguaje(lenguaje: string) {
  if (lenguaje === 'kotlin') return [StreamLanguage.define(kotlin)];
  if (lenguaje === 'swift') return [StreamLanguage.define(swift)];
  return [];
}

export const NOMBRE_LENGUAJE: Record<string, string> = { kotlin: 'Kotlin', swift: 'Swift' };
