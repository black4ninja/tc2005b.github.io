import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { Coleccion } from '../models/Coleccion.js';
import {
  Documento,
  DOCUMENTO_TIPOS,
  DOCUMENTO_PLANTILLAS,
  type DocumentoTipo,
  type DocumentoPlantilla,
} from '../models/Documento.js';
import { DocumentoVersion } from '../models/DocumentoVersion.js';
import type { AppUser } from '../models/AppUser.js';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Esqueletos MD de las plantillas de página (design §1/§3). */
const PLANTILLA_CUERPO: Record<DocumentoPlantilla, string> = {
  laboratorio: [
    '# Título del laboratorio',
    '',
    ':::note Antes de empezar',
    'Requisitos y materiales previos.',
    ':::',
    '',
    '## Objetivo',
    '',
    '## Instrucciones',
    '',
    '## Entrega',
    '',
  ].join('\n'),
  lectura: ['# Título de la lectura', '', '## Introducción', '', '## Contenido', '', '## Referencias', ''].join('\n'),
  temario: ['# Temario', '', '| Clase | Tema |', '| ----- | ---- |', '| 1 |  |', ''].join('\n'),
};

function parseSlug(valor: unknown): string | null {
  return typeof valor === 'string' && SLUG_REGEX.test(valor) ? valor : null;
}

/** Colección existente por id (compartido con recursos.controller). */
export async function getColeccionActiva(id: string): Promise<Coleccion | null> {
  try {
    const q = new Parse.Query<Coleccion>('Coleccion');
    q.equalTo('exists' as any, true as any);
    return await q.get(id, { useMasterKey: true });
  } catch {
    return null;
  }
}

/**
 * Busca un documento existente con su colección viva. Filtra SOLO por
 * `exists` (no `active`): el admin gestiona también documentos desactivados
 * — el flag `active` gobierna visibilidad en el visor (US-3), no la edición.
 */
export async function buscarDocumento(docId: string): Promise<{ documento: Documento; coleccion: Coleccion } | null> {
  try {
    const q = new Parse.Query<Documento>('Documento');
    q.equalTo('exists' as any, true as any);
    q.include(['coleccion', 'borrador', 'version'] as any);
    const documento = await q.get(docId, { useMasterKey: true });
    const coleccion = documento.getColeccion();
    if (!coleccion || coleccion.get('exists') === false) return null;
    return { documento, coleccion };
  } catch {
    return null;
  }
}

/**
 * Devuelve el borrador único del documento, creándolo si no existe.
 * Único punto donde se crean borradores (numeración, autor y enlace a
 * Documento.borrador viven aquí) — lo usan saveBorrador y restaurarVersion.
 *
 * Mitigación de carreras (dos autosaves simultáneos, o autosave vs publicar):
 * tras crear la versión se RE-LEE el documento; si otro request enlazó un
 * borrador entre tanto, descartamos el nuestro y usamos el suyo. La ventana
 * restante es de milisegundos y el peor caso es un autosave perdido (el
 * siguiente lo corrige), nunca una versión publicada mutada.
 */
export async function asegurarBorrador(
  docId: string,
  autor?: AppUser,
): Promise<{ documento: Documento; borrador: DocumentoVersion } | null> {
  const encontrado = await buscarDocumento(docId);
  if (!encontrado) return null;
  let { documento } = encontrado;

  const existente = documento.getBorrador();
  if (existente) return { documento, borrador: existente };

  const nuevo = new DocumentoVersion().initDefaults();
  nuevo.setDocumento(documento);
  nuevo.setNumero((documento.getVersion()?.getNumero() ?? 0) + 1);
  if (autor) nuevo.setAutor(autor);
  await nuevo.save(null, { useMasterKey: true });

  // Re-check: ¿alguien más creó y enlazó un borrador mientras guardábamos?
  const recheck = await buscarDocumento(docId);
  const ajeno = recheck?.documento.getBorrador();
  if (recheck && ajeno && ajeno.id !== nuevo.id) {
    await nuevo.destroy({ useMasterKey: true });
    return { documento: recheck.documento, borrador: ajeno };
  }

  documento = recheck?.documento ?? documento;
  documento.setBorrador(nuevo);
  await documento.save(null, { useMasterKey: true });
  return { documento, borrador: nuevo };
}

/** Query base de documentos existentes de una colección. */
function queryDocumentos(coleccion: Coleccion): Parse.Query<Documento> {
  const q = new Parse.Query<Documento>('Documento');
  q.equalTo('exists' as any, true as any);
  q.equalTo('coleccion' as any, coleccion as any);
  return q;
}

/** ¿Ya hay un hermano con ese slug bajo el mismo padre? */
async function slugDuplicado(
  coleccion: Coleccion,
  padre: Documento | null,
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const q = queryDocumentos(coleccion);
  q.equalTo('slug' as any, slug as any);
  if (padre) q.equalTo('padre' as any, padre as any);
  else q.doesNotExist('padre' as any);
  if (excludeId) q.notEqualTo('objectId' as any, excludeId as any);
  return !!(await q.first({ useMasterKey: true }));
}

/** Hermanos existentes bajo un padre (o raíz), ordenados. */
async function getHermanos(coleccion: Coleccion, padre: Documento | null): Promise<Documento[]> {
  const q = queryDocumentos(coleccion);
  if (padre) q.equalTo('padre' as any, padre as any);
  else q.doesNotExist('padre' as any);
  q.ascending('orden');
  q.limit(10000);
  return q.find({ useMasterKey: true });
}

/**
 * GET /admin/colecciones/:id/documentos — todos los documentos de la
 * colección en lista plana (coleccionId/padreId/orden); el cliente arma el árbol.
 */
export async function listDocumentosColeccion(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const coleccion = await getColeccionActiva(id);
    if (!coleccion) {
      res.status(404).json({ status: 'error', message: 'Colección no encontrada' });
      return;
    }
    const q = queryDocumentos(coleccion);
    q.ascending('orden');
    q.limit(10000);
    const documentos = await q.find({ useMasterKey: true });

    res.json({ status: 'ok', documentos: documentos.map((d) => d.toSafeJSON()) });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener documentos' });
  }
}

/** POST /admin/colecciones/:id/documentos — crear página/categoría. */
export async function createDocumento(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { titulo, slug, tipo, padreId, plantilla } = req.body;

  if (!titulo || typeof titulo !== 'string' || titulo.trim() === '') {
    res.status(400).json({ status: 'error', message: 'El título es requerido' });
    return;
  }
  const slugValido = parseSlug(slug);
  if (!slugValido) {
    res.status(400).json({ status: 'error', message: 'El slug es requerido y debe contener solo letras minúsculas, números y guiones' });
    return;
  }
  const tipoValido: DocumentoTipo = DOCUMENTO_TIPOS.includes(tipo) ? tipo : 'md';
  // La plantilla solo aplica a páginas Markdown (una página HTML con esqueleto MD sería basura).
  const plantillaValida: DocumentoPlantilla | null =
    tipoValido === 'md' && DOCUMENTO_PLANTILLAS.includes(plantilla) ? plantilla : null;

  try {
    const coleccion = await getColeccionActiva(id);
    if (!coleccion) {
      res.status(404).json({ status: 'error', message: 'Colección no encontrada' });
      return;
    }

    let padre: Documento | null = null;
    if (padreId) {
      const pq = queryDocumentos(coleccion);
      padre = await pq.get(padreId, { useMasterKey: true }).catch(() => null);
      if (!padre) {
        res.status(400).json({ status: 'error', message: 'El padre indicado no existe en esta colección' });
        return;
      }
      if (padre.getTipo() !== 'categoria') {
        res.status(400).json({ status: 'error', message: 'Solo una categoría puede tener hijos' });
        return;
      }
    }

    // "ejercicios" en la RAÍZ de la colección chocaría con la ruta del alumno
    // /contenidos/:slug/ejercicios (mini-juez), dejando ese documento inalcanzable.
    // Se reserva solo a nivel raíz (anidado no colisiona).
    if (!padre && slugValido === 'ejercicios') {
      res.status(409).json({ status: 'error', message: '"ejercicios" es una ruta reservada en la raíz de la colección; usa otro slug.' });
      return;
    }

    if (await slugDuplicado(coleccion, padre, slugValido)) {
      res.status(409).json({ status: 'error', message: 'Ya existe un documento con ese slug en este nivel' });
      return;
    }

    // Al final de sus hermanos: max(orden)+1 (length colisionaría tras un borrado,
    // porque el soft-delete deja huecos en la numeración).
    const hermanos = await getHermanos(coleccion, padre);
    const ordenFinal = hermanos.length ? Math.max(...hermanos.map((h) => h.getOrden())) + 1 : 0;

    const documento = new Documento().initDefaults();
    documento.setColeccion(coleccion);
    documento.setPadre(padre);
    documento.setTitulo(titulo.trim());
    documento.setSlug(slugValido);
    documento.setTipo(tipoValido);
    documento.setOrden(ordenFinal);
    documento.setPlantilla(plantillaValida);
    documento.setPublicado(false);
    await documento.save(null, { useMasterKey: true });

    // Las páginas (no categorías) nacen con un borrador (esqueleto de plantilla si aplica).
    if (tipoValido !== 'categoria') {
      const borrador = new DocumentoVersion().initDefaults();
      borrador.setDocumento(documento);
      borrador.setNumero(1);
      borrador.setCuerpo(plantillaValida ? PLANTILLA_CUERPO[plantillaValida] : '');
      const autor = req.appUser as AppUser | undefined;
      if (autor) borrador.setAutor(autor);
      await borrador.save(null, { useMasterKey: true });
      documento.setBorrador(borrador);
      await documento.save(null, { useMasterKey: true });
    }

    res.status(201).json({ status: 'ok', documento: documento.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear documento' });
  }
}

/** PUT /admin/documentos/:docId — actualizar metadatos (título, slug, plantilla). */
export async function updateDocumento(req: Request, res: Response): Promise<void> {
  const { docId } = req.params;
  const { titulo, slug, plantilla } = req.body;

  try {
    const encontrado = await buscarDocumento(docId);
    if (!encontrado) {
      res.status(404).json({ status: 'error', message: 'Documento no encontrado' });
      return;
    }
    const { documento, coleccion } = encontrado;

    if (titulo !== undefined) {
      if (typeof titulo !== 'string' || titulo.trim() === '') {
        res.status(400).json({ status: 'error', message: 'El título no puede estar vacío' });
        return;
      }
      documento.setTitulo(titulo.trim());
    }

    if (slug !== undefined) {
      const slugValido = parseSlug(slug);
      if (!slugValido) {
        res.status(400).json({ status: 'error', message: 'El slug debe contener solo letras minúsculas, números y guiones' });
        return;
      }
      if (slugValido !== documento.getSlug()) {
        const padre = documento.getPadre() ?? null;
        if (await slugDuplicado(coleccion, padre, slugValido, docId)) {
          res.status(409).json({ status: 'error', message: 'Ya existe un documento con ese slug en este nivel' });
          return;
        }
        documento.setSlug(slugValido);
      }
    }

    if (plantilla !== undefined) {
      documento.setPlantilla(
        documento.getTipo() === 'md' && DOCUMENTO_PLANTILLAS.includes(plantilla) ? plantilla : null,
      );
    }

    await documento.save(null, { useMasterKey: true });
    res.json({ status: 'ok', documento: documento.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al actualizar documento' });
  }
}

/**
 * PUT /admin/documentos/:docId/mover — { padreId: string|null, orden: number }.
 * Reubica el documento y renumera a los hermanos de destino secuencialmente.
 */
export async function moveDocumento(req: Request, res: Response): Promise<void> {
  const { docId } = req.params;
  const { padreId, orden } = req.body;

  if (typeof orden !== 'number' || orden < 0 || !Number.isInteger(orden)) {
    res.status(400).json({ status: 'error', message: 'orden debe ser un entero >= 0' });
    return;
  }

  try {
    const encontrado = await buscarDocumento(docId);
    if (!encontrado) {
      res.status(404).json({ status: 'error', message: 'Documento no encontrado' });
      return;
    }
    const { documento, coleccion } = encontrado;

    let nuevoPadre: Documento | null = null;
    if (padreId) {
      if (padreId === docId) {
        res.status(400).json({ status: 'error', message: 'Un documento no puede ser su propio padre' });
        return;
      }
      nuevoPadre = await queryDocumentos(coleccion).get(padreId, { useMasterKey: true }).catch(() => null);
      if (!nuevoPadre) {
        res.status(400).json({ status: 'error', message: 'El padre indicado no existe en esta colección' });
        return;
      }
      if (nuevoPadre.getTipo() !== 'categoria') {
        res.status(400).json({ status: 'error', message: 'Solo una categoría puede tener hijos' });
        return;
      }
      // Anti-ciclo: el nuevo padre no puede ser descendiente del documento.
      let cursor: Documento | undefined = nuevoPadre;
      const visitados = new Set<string>();
      while (cursor) {
        if (cursor.id === docId) {
          res.status(400).json({ status: 'error', message: 'No se puede mover un documento dentro de sí mismo' });
          return;
        }
        if (visitados.has(cursor.id)) break; // dato corrupto: cortar
        visitados.add(cursor.id);
        const padreRef: Documento | undefined = cursor.get('padre');
        cursor = padreRef
          ? await new Parse.Query<Documento>('Documento').get(padreRef.id, { useMasterKey: true }).catch(() => undefined)
          : undefined;
      }
    }

    // El slug debe seguir siendo único en el nivel destino.
    if (await slugDuplicado(coleccion, nuevoPadre, documento.getSlug(), docId)) {
      res.status(409).json({ status: 'error', message: 'Ya existe un documento con ese slug en el nivel destino' });
      return;
    }

    // Insertar entre los hermanos destino y renumerar 0..n; solo se guardan
    // los que realmente cambiaron (evita reescribir n objetos por movimiento).
    const hermanos = (await getHermanos(coleccion, nuevoPadre)).filter((h) => h.id !== docId);
    const posicion = Math.min(orden, hermanos.length);
    hermanos.splice(posicion, 0, documento);

    const padreAnteriorId = documento.getPadre()?.id ?? null;
    const cambiados: Documento[] = [];
    hermanos.forEach((h, i) => {
      const cambioOrden = h.getOrden() !== i;
      const cambioPadre = h.id === docId && padreAnteriorId !== (nuevoPadre?.id ?? null);
      if (cambioOrden) h.setOrden(i);
      if (cambioPadre) h.setPadre(nuevoPadre);
      if (cambioOrden || cambioPadre) cambiados.push(h);
    });
    if (cambiados.length) await Parse.Object.saveAll(cambiados, { useMasterKey: true });

    res.json({ status: 'ok', documento: documento.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al mover documento' });
  }
}

/** DELETE /admin/documentos/:docId — soft-delete (bloquea si tiene hijos existentes). */
export async function deleteDocumento(req: Request, res: Response): Promise<void> {
  const { docId } = req.params;

  try {
    const encontrado = await buscarDocumento(docId);
    if (!encontrado) {
      res.status(404).json({ status: 'error', message: 'Documento no encontrado' });
      return;
    }
    const { documento } = encontrado;

    const hijos = new Parse.Query<Documento>('Documento');
    hijos.equalTo('exists' as any, true as any);
    hijos.equalTo('padre' as any, documento as any);
    if (await hijos.first({ useMasterKey: true })) {
      res.status(409).json({ status: 'error', message: 'No se puede eliminar: tiene páginas hijas. Muévelas o elimínalas primero.' });
      return;
    }

    documento.softDelete();
    await documento.save(null, { useMasterKey: true });

    res.json({ status: 'ok', message: 'Documento eliminado' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al eliminar documento' });
  }
}

/** GET /admin/documentos/:docId/borrador — cuerpo editable (borrador ?? publicada). */
export async function getBorrador(req: Request, res: Response): Promise<void> {
  const { docId } = req.params;

  try {
    const encontrado = await buscarDocumento(docId);
    if (!encontrado) {
      res.status(404).json({ status: 'error', message: 'Documento no encontrado' });
      return;
    }
    const { documento } = encontrado;
    if (documento.getTipo() === 'categoria') {
      res.status(400).json({ status: 'error', message: 'Las categorías no tienen cuerpo' });
      return;
    }

    const version = documento.getBorrador() ?? documento.getVersion();
    res.json({
      status: 'ok',
      documento: documento.toSafeJSON(),
      cuerpo: version?.getCuerpo() ?? '',
      esBorrador: !!documento.getBorrador(),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener borrador' });
  }
}

/**
 * PUT /admin/documentos/:docId/borrador — { cuerpo } guarda el borrador único
 * (lo crea si no existe). El render y publicar llegan en la US-2.
 */
export async function saveBorrador(req: Request, res: Response): Promise<void> {
  const { docId } = req.params;
  const { cuerpo } = req.body;

  if (typeof cuerpo !== 'string') {
    res.status(400).json({ status: 'error', message: 'cuerpo debe ser un string' });
    return;
  }

  try {
    const autor = req.appUser as AppUser | undefined;
    const resultado = await asegurarBorrador(docId, autor);
    if (!resultado) {
      res.status(404).json({ status: 'error', message: 'Documento no encontrado' });
      return;
    }
    const { documento, borrador } = resultado;
    if (documento.getTipo() === 'categoria') {
      res.status(400).json({ status: 'error', message: 'Las categorías no tienen cuerpo' });
      return;
    }

    borrador.setCuerpo(cuerpo);
    if (autor) borrador.setAutor(autor);
    await borrador.save(null, { useMasterKey: true });

    res.json({ status: 'ok', esBorrador: true });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al guardar borrador' });
  }
}
