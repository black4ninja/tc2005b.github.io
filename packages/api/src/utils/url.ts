/**
 * Sanitización de URLs que después se renderizan como `<a href>`.
 *
 * Vive aparte del controlador para poder testearse sin servidor ni BD: es código
 * de seguridad, y el test es lo que impide que alguien "simplifique" la
 * validación sin darse cuenta de lo que protege.
 */

/**
 * Valida y normaliza una URL destinada a un `href`.
 *
 * SOLO acepta `http` y `https`. Un `javascript:alert(document.cookie)` guardado
 * en un campo que luego se pinta como enlace se ejecuta al hacer clic, en la
 * sesión de quien lo pulse — admin o alumno. Lo mismo `data:` (puede llevar un
 * documento HTML entero) y `vbscript:`.
 *
 * @returns la URL normalizada, `''` si no hay URL (campo vacío = quitar el
 *          enlace), o `null` si es inválida — que el llamador debe tratar como
 *          error del cliente, nunca guardando el valor.
 */
export function sanitizarUrlHref(valor: unknown): string | null {
  if (valor === null || valor === undefined) return '';
  if (typeof valor !== 'string') return null;

  const limpio = valor.trim();
  if (!limpio) return '';

  let url: URL;
  try {
    // `new URL` sin base rechaza las rutas relativas ("/politicas"), que es lo
    // que queremos: este campo es para enlaces externos.
    url = new URL(limpio);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  return url.toString();
}
