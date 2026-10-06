import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { Pregunta } from '../models/Pregunta.js';
import type { VisorAsesoria } from '../models/VisorAsesoria.js';

/**
 * Apaga los visores de asesoría de una pregunta, en TODOS los grupos.
 *
 * Se llama al desmarcarla, archivarla o borrarla. Dejarlos encendidos no se
 * nota mientras tanto —el visor público ya responde 404—, pero al volver a
 * marcarla el enlace viejo reviviría para quien lo escaneó en su día.
 */
export async function apagarVisoresDePregunta(preguntaId: string): Promise<number> {
  const q = BaseModel.queryActive<VisorAsesoria>('VisorAsesoria');
  q.equalTo('pregunta' as any, Pregunta.createWithoutData(preguntaId) as any);
  q.limit(1000);
  const visores = await q.find({ useMasterKey: true });
  for (const v of visores) v.softDelete();
  if (visores.length > 0) await Parse.Object.saveAll(visores, { useMasterKey: true });
  return visores.length;
}
