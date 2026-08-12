/**
 * Parte el nombre de un grupo en la parte que TODOS comparten y el número de
 * sección, que es lo único que los distingue.
 *
 * "AgoDic26 TC2008B 101" → { prefijo: "AgoDic26 TC2008B", seccion: "101" }
 *
 * Existe porque leer la línea entera para caer en la última cifra es justo lo
 * que hace confundir 101 con 102 en una lista. Separada, la sección se puede
 * pintar grande y en negrita, y el ojo va ahí directo.
 *
 * Solo parte cuando queda algo delante: un grupo llamado "501" a secas se
 * devuelve entero como prefijo, porque una insignia suelta sin nombre al lado
 * no dice de qué grupo se trata.
 */
export interface NombreGrupoPartido {
  /** Lo compartido: periodo y clave de materia. Puede ser el nombre entero. */
  prefijo: string;
  /** Número de sección, o cadena vacía si el nombre no acaba en uno. */
  seccion: string;
}

/** Dos a cuatro cifras al final: 101, 4to no (no es solo cifras), 2026 sí. */
const SECCION_FINAL = /^(.*\S)\s+(\d{2,4})$/;

export function partirNombreGrupo(nombre: string | undefined | null): NombreGrupoPartido {
  const limpio = (nombre ?? '').trim().replace(/\s+/g, ' ');
  const m = SECCION_FINAL.exec(limpio);
  if (!m) return { prefijo: limpio, seccion: '' };
  return { prefijo: m[1], seccion: m[2] };
}
