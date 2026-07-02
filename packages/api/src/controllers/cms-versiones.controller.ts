import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { renderMarkdown, extraerToc } from '@tc2005b/contenido-pipeline';
import { DocumentoVersion } from '../models/DocumentoVersion.js';
import type { Documento } from '../models/Documento.js';
import type { AppUser } from '../models/AppUser.js';
import { buscarDocumento, asegurarBorrador } from './cms-documentos.controller.js';

/**
 * Versionado del CMS "Contenidos" (design §1/§3): publicar congela el
 * borrador como versión nueva (con cuerpoHtml renderizado por el pipeline
 * compartido); restaurar copia una versión vieja AL BORRADOR (el pasado
 * nunca se muta) para revisarla y publicarla.
 */

/** Versión de un documento, verificando la pertenencia. */
async function buscarVersion(documento: Documento, versionId: string): Promise<DocumentoVersion | null> {
  try {
    const q = new Parse.Query<DocumentoVersion>('DocumentoVersion');
    q.equalTo('exists' as any, true as any);
    q.equalTo('documento' as any, documento as any);
    q.include('autor' as any);
    return await q.get(versionId, { useMasterKey: true });
  } catch {
    return null;
  }
}

/**
 * POST /admin/documentos/:docId/publicar — { mensaje? }
 * El borrador se convierte en la versión publicada: se renderiza cuerpoHtml
 * (solo Markdown; el HTML crudo se sirve sandboxeado en US-5), se numera y
 * se apunta Documento.version. El siguiente edit creará un borrador nuevo.
 */
export async function publicarDocumento(req: Request, res: Response): Promise<void> {
  const { docId } = req.params;
  const { mensaje } = req.body ?? {};

  try {
    const encontrado = await buscarDocumento(docId);
    if (!encontrado) {
      res.status(404).json({ status: 'error', message: 'Documento no encontrado' });
      return;
    }
    const { documento } = encontrado;
    if (documento.getTipo() === 'categoria') {
      res.status(400).json({ status: 'error', message: 'Las categorías no se publican' });
      return;
    }

    const borrador = documento.getBorrador();
    if (!borrador) {
      res.status(400).json({ status: 'error', message: 'No hay cambios de borrador que publicar' });
      return;
    }

    const numeroNuevo = (documento.getVersion()?.getNumero() ?? 0) + 1;
    borrador.setNumero(numeroNuevo);
    if (documento.getTipo() === 'md') {
      const cuerpoHtml = await renderMarkdown(borrador.getCuerpo());
      borrador.setCuerpoHtml(cuerpoHtml);
      // El TOC se congela junto con el render: el visor lo recibe en el JSON.
      borrador.setToc(extraerToc(cuerpoHtml));
    } else {
      // Páginas html: el cuerpo crudo se sirve por su endpoint sandboxeado (US-5).
      borrador.setCuerpoHtml('');
      borrador.setToc([]);
    }
    if (typeof mensaje === 'string' && mensaje.trim()) borrador.setMensaje(mensaje.trim());
    const autor = req.appUser as AppUser | undefined;
    if (autor) borrador.setAutor(autor);
    await borrador.save(null, { useMasterKey: true });

    documento.setVersion(borrador);
    documento.setBorrador(null);
    documento.setPublicado(true);
    await documento.save(null, { useMasterKey: true });

    res.json({ status: 'ok', documento: documento.toSafeJSON(), version: numeroNuevo });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al publicar documento' });
  }
}

/** GET /admin/documentos/:docId/versiones — historial (sin cuerpos, que pesan). */
export async function listVersiones(req: Request, res: Response): Promise<void> {
  const { docId } = req.params;

  try {
    const encontrado = await buscarDocumento(docId);
    if (!encontrado) {
      res.status(404).json({ status: 'error', message: 'Documento no encontrado' });
      return;
    }
    const { documento } = encontrado;

    const q = new Parse.Query<DocumentoVersion>('DocumentoVersion');
    q.equalTo('exists' as any, true as any);
    q.equalTo('documento' as any, documento as any);
    q.include('autor' as any);
    // Solo metadatos: sin select, cada versión arrastraría cuerpo y
    // cuerpoHtml completos (documentos con mucho historial = MBs por abrir
    // el modal). createdAt/updatedAt siempre vienen.
    q.select(['numero', 'mensaje', 'autor'] as any);
    q.descending('createdAt');
    q.limit(500);
    const versiones = await q.find({ useMasterKey: true });

    const borradorId = documento.getBorrador()?.id ?? null;
    const publicadaId = documento.getVersion()?.id ?? null;

    res.json({
      status: 'ok',
      versiones: versiones.map((v) => {
        const autor = v.getAutor();
        return {
          id: v.id,
          numero: v.getNumero(),
          mensaje: v.getMensaje() ?? null,
          autor: autor ? { id: autor.id, name: autor.get('name') ?? null } : null,
          esBorrador: v.id === borradorId,
          esPublicada: v.id === publicadaId,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        };
      }),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener versiones' });
  }
}

/** GET /admin/documentos/:docId/versiones/:versionId — una versión con su cuerpo. */
export async function getVersion(req: Request, res: Response): Promise<void> {
  const { docId, versionId } = req.params;

  try {
    const encontrado = await buscarDocumento(docId);
    if (!encontrado) {
      res.status(404).json({ status: 'error', message: 'Documento no encontrado' });
      return;
    }
    const version = await buscarVersion(encontrado.documento, versionId);
    if (!version) {
      res.status(404).json({ status: 'error', message: 'Versión no encontrada' });
      return;
    }

    res.json({ status: 'ok', version: version.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener versión' });
  }
}

/**
 * POST /admin/documentos/:docId/versiones/:versionId/restaurar
 * Copia el cuerpo de la versión indicada AL BORRADOR (creándolo si no hay).
 * Nunca muta versiones pasadas; el admin revisa el borrador y publica.
 */
export async function restaurarVersion(req: Request, res: Response): Promise<void> {
  const { docId, versionId } = req.params;

  try {
    const encontrado = await buscarDocumento(docId);
    if (!encontrado) {
      res.status(404).json({ status: 'error', message: 'Documento no encontrado' });
      return;
    }
    const { documento } = encontrado;
    if (documento.getTipo() === 'categoria') {
      res.status(400).json({ status: 'error', message: 'Las categorías no tienen versiones' });
      return;
    }
    const version = await buscarVersion(documento, versionId);
    if (!version) {
      res.status(404).json({ status: 'error', message: 'Versión no encontrada' });
      return;
    }
    if (version.id === documento.getBorrador()?.id) {
      res.status(400).json({ status: 'error', message: 'Esa versión ya es el borrador actual' });
      return;
    }

    const autor = req.appUser as AppUser | undefined;
    const resultado = await asegurarBorrador(docId, autor);
    if (!resultado) {
      res.status(404).json({ status: 'error', message: 'Documento no encontrado' });
      return;
    }
    const { borrador } = resultado;
    borrador.setCuerpo(version.getCuerpo());
    borrador.setMensaje(`restaurado de v${version.getNumero()}`);
    if (autor) borrador.setAutor(autor);
    await borrador.save(null, { useMasterKey: true });

    res.json({ status: 'ok', cuerpo: borrador.getCuerpo(), esBorrador: true });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al restaurar versión' });
  }
}
