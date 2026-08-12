/**
 * Fechas de un grupo, pintadas como un periodo.
 *
 * Se formatean SIEMPRE en UTC porque así se guardan: son días de calendario
 * anclados a la medianoche UTC (ver `parseFechaDia()` en la API). Sin fijar la
 * zona, el navegador las traduce a la local y en México (UTC-6) la medianoche
 * del 10-ago cae el 9-ago: la tabla enseñaba el día anterior al capturado.
 */

/** Una fecha suelta: "10 ago 2026". Vacía o ilegible → guion. */
export function formatFecha(valor?: string): string {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-MX', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Las dos fechas como un rango legible, para que ocupen una columna y no dos.
 *
 * Cuando ambas caen en el mismo año, el año se dice UNA vez al final
 * ("10 ago – 23 oct 2026"), que es como se escribe un periodo. Si el grupo
 * cruza de año, las dos lo llevan: ahí el dato importa.
 */
export function formatPeriodo(inicio?: string, fin?: string): string {
  if (!inicio && !fin) return '—';
  if (!inicio) return `hasta ${formatFecha(fin)}`;
  if (!fin) return `desde ${formatFecha(inicio)}`;

  const dInicio = new Date(inicio);
  const dFin = new Date(fin);
  if (Number.isNaN(dInicio.getTime()) || Number.isNaN(dFin.getTime())) {
    return `${formatFecha(inicio)} – ${formatFecha(fin)}`;
  }

  const mismoAnio = dInicio.getUTCFullYear() === dFin.getUTCFullYear();
  const inicioTexto = mismoAnio
    ? dInicio.toLocaleDateString('es-MX', { timeZone: 'UTC', month: 'short', day: 'numeric' })
    : formatFecha(inicio);

  return `${inicioTexto} – ${formatFecha(fin)}`;
}
