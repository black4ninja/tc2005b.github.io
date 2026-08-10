/**
 * Reglas de los archivos adjuntos a una actividad de tipo «presentación».
 *
 * Solo el HTML se sirve INLINE (para que la presentación abra en el navegador);
 * cualquier otro archivo baja como attachment. Es la misma postura que el CMS
 * en `recursos.controller.ts`, pero al revés: allí el HTML inline se descartó
 * por XSS. Aquí sí se abre, y el riesgo se cierra con la cabecera `sandbox`
 * (ver `CSP_PRESENTACION`), que mete el documento en un origen opaco: sin
 * acceso a las cookies ni al localStorage del sitio.
 */

export const PRESENTACION_MAX_BYTES = 50 * 1024 * 1024;

/**
 * `sandbox` sin `allow-same-origin` ⇒ origen opaco: el HTML subido no puede
 * leer la cookie de sesión ni hablar con el API en nombre de quien lo abre.
 * `allow-scripts` se concede porque una presentación (Marp, Slidev, reveal en
 * un archivo) no navega sin JS. `allow-popups*` deja que sus enlaces abran
 * fuera; sin `-to-escape-sandbox` el popup heredaría el sandbox y muchas
 * páginas de destino se romperían.
 */
export const CSP_PRESENTACION =
  'sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals';

/** Extensiones que tratamos como HTML autocontenido. */
const EXTENSIONES_HTML = ['.html', '.htm'];

/**
 * ¿Se abre en el navegador o se descarga? Decide por extensión y no por el
 * mime: el mime lo declara el cliente al subir y no es confiable — un `.pptx`
 * anunciado como `text/html` se abriría inline sin serlo.
 */
export function seSirveInline(nombre: string): boolean {
  const limpio = nombre.toLowerCase();
  return EXTENSIONES_HTML.some((ext) => limpio.endsWith(ext));
}

/**
 * Nombre de archivo seguro conservando la extensión: sin rutas, espacios ni
 * comillas (viaja en la cabecera `Content-Disposition`).
 */
export function sanitizarNombreArchivo(original: string): string {
  const soloNombre = original.split(/[\\/]/).pop() ?? original;
  const punto = soloNombre.lastIndexOf('.');
  const base = (punto > 0 ? soloNombre.slice(0, punto) : soloNombre)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'presentacion';
  const ext = punto > 0
    ? soloNombre.slice(punto + 1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)
    : '';
  return ext ? `${base}.${ext}` : base;
}
