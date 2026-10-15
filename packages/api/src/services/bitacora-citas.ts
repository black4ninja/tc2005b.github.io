/**
 * Bitácora de un día de entrevistas: quién reservó, canceló o movió cada hueco
 * y cuándo lo hizo.
 *
 * No hay una tabla de eventos: se reconstruye de las propias citas, vivas y
 * canceladas (`createdAt` + `creadaPor`, `canceladaEn` + `canceladaPor`,
 * `movimientos`). Así funciona también hacia atrás, con las citas que ya había
 * antes de la bitácora; lo único que les falta es QUIÉN canceló, que entonces
 * no se guardaba, y sale como `por: null`.
 */

export interface PersonaBitacora {
  id: string;
  nombre: string;
  /** Lo hizo el propio alumno de la cita (y no el profesor por él). */
  esElAlumno: boolean;
}

export interface EventoBitacora {
  tipo: 'reserva' | 'cancelacion' | 'movimiento';
  /** Cuándo se hizo. */
  en: string;
  /** El hueco afectado; en un movimiento, el de destino. */
  hueco: string;
  /** Solo en movimientos: el hueco de origen. */
  desde: string | null;
  citaId: string;
  alumno: { id: string; nombre: string; matricula: string } | null;
  competencia: string | null;
  /** Quién lo hizo. `null` = no consta (cancelaciones de antes de la bitácora). */
  por: PersonaBitacora | null;
}

/** Lo que la bitácora necesita de una cita, ya sin Parse. */
export interface CitaParaBitacora {
  id: string;
  inicio: string;
  creadaEn: string;
  creadaPorId: string | null;
  canceladaEn: string | null;
  canceladaPorId: string | null;
  movimientos: { de: string; a: string; en: string; porId: string | null }[];
  alumno: { id: string; nombre: string; matricula: string } | null;
  competencia: string | null;
}

/**
 * Eventos de las citas que tocaron algún hueco del rango [desde, hasta), del más
 * antiguo al más reciente. Un movimiento cuenta si sale o llega al rango: una
 * cita que el profesor se llevó a otro día también dejó libre un hueco de este.
 */
export function bitacoraDelDia(
  citas: readonly CitaParaBitacora[],
  desde: Date,
  hasta: Date,
  nombres: ReadonlyMap<string, string>,
): EventoBitacora[] {
  const enRango = (iso: string | null) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= desde.getTime() && t < hasta.getTime();
  };
  const persona = (id: string | null, cita: CitaParaBitacora): PersonaBitacora | null =>
    id ? { id, nombre: nombres.get(id) ?? '(usuario desconocido)', esElAlumno: id === cita.alumno?.id } : null;

  const eventos: EventoBitacora[] = [];
  for (const c of citas) {
    const base = { citaId: c.id, alumno: c.alumno, competencia: c.competencia };
    const movs = [...c.movimientos].sort((a, b) => a.en.localeCompare(b.en));
    // Mover reescribe `inicio`: el hueco que se reservó es el de origen del
    // PRIMER movimiento.
    const reservado = movs[0]?.de ?? c.inicio;
    if (enRango(reservado)) {
      eventos.push({ ...base, tipo: 'reserva', en: c.creadaEn, hueco: reservado, desde: null, por: persona(c.creadaPorId, c) });
    }
    for (const m of movs) {
      if (enRango(m.de) || enRango(m.a)) {
        eventos.push({ ...base, tipo: 'movimiento', en: m.en, hueco: m.a, desde: m.de, por: persona(m.porId, c) });
      }
    }
    if (c.canceladaEn && enRango(c.inicio)) {
      eventos.push({ ...base, tipo: 'cancelacion', en: c.canceladaEn, hueco: c.inicio, desde: null, por: persona(c.canceladaPorId, c) });
    }
  }
  return eventos.sort((a, b) => a.en.localeCompare(b.en));
}
