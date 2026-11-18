/**
 * Reglas puras del Happiness Door (sin Parse ni Express, para poder probarlas).
 */

export const ESTADOS_HAPPINESS = ['positivo', 'neutral', 'negativo'] as const;
export type EstadoHappiness = (typeof ESTADOS_HAPPINESS)[number];

/** Tope del texto: un párrafo largo cabe de sobra; un documento pegado, no. */
export const TEXTO_HAPPINESS_MAX = 5000;

export function esEstadoHappiness(v: unknown): v is EstadoHappiness {
  return typeof v === 'string' && (ESTADOS_HAPPINESS as readonly string[]).includes(v);
}

/** `AAAA-MM-DD` que además es una fecha real (no `2026-02-30`). */
export function esDiaValido(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export type ValidacionEntrada =
  | { ok: true; estado?: EstadoHappiness; texto?: string }
  | { ok: false; error: string };

/**
 * Valida el body de una entrada. Al crear hacen falta los dos campos; al editar
 * basta con uno, y el que no venga se queda como estaba.
 */
export function validarEntrada(body: unknown, creando: boolean): ValidacionEntrada {
  const { estado, texto } = (body ?? {}) as Record<string, unknown>;
  const out: { ok: true; estado?: EstadoHappiness; texto?: string } = { ok: true };

  if (estado !== undefined) {
    if (!esEstadoHappiness(estado)) return { ok: false, error: 'El estado debe ser positivo, neutral o negativo' };
    out.estado = estado;
  } else if (creando) {
    return { ok: false, error: 'Elige cómo te fue: positivo, neutral o negativo' };
  }

  if (texto !== undefined) {
    if (typeof texto !== 'string' || texto.trim() === '') return { ok: false, error: 'Escribe tu retroalimentación' };
    if (texto.length > TEXTO_HAPPINESS_MAX) {
      return { ok: false, error: `La retroalimentación no puede pasar de ${TEXTO_HAPPINESS_MAX} caracteres` };
    }
    out.texto = texto.trim();
  } else if (creando) {
    return { ok: false, error: 'Escribe tu retroalimentación' };
  }

  if (!creando && out.estado === undefined && out.texto === undefined) {
    return { ok: false, error: 'No hay nada que cambiar' };
  }
  return out;
}
