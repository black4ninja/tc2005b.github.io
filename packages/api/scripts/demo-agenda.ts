/**
 * Segunda parte de la demo: la agenda de verificaciones 1 a 1 del grupo DEMO.
 * Crea días, citas, la pregunta asignada a cada una y algunas evidencias.
 * Se borra con `--limpiar` (o con el `--limpiar` de demo-industrial.ts).
 */
import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
Parse.initialize(config.appId);
(Parse as any).serverURL = config.serverURL;
(Parse as any).masterKey = config.masterKey;

const DEMO = 'oPdNsUELtw';
const P = (c: string, id: string) => ({ __type: 'Pointer', className: c, objectId: id } as any);
const gp = P('Grupo', DEMO);
const limpiar = process.argv.includes('--limpiar');

/** Un día laborable a las 09:00 de Querétaro (UTC-6). */
function dia(offsetDias: number, hora: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDias);
  d.setUTCHours(hora + 6, 0, 0, 0);
  return d;
}

(async () => {
  if (limpiar) {
    let n = 0;
    for (const clase of ['CitaEntrevista', 'DiaEntrevistas', 'PreguntaAsignacion', 'EvidenciaCompetencia']) {
      const objs: any[] = await new Parse.Query(clase).equalTo('grupo', gp).limit(500).find({ useMasterKey: true });
      for (const o of objs) { await o.destroy({ useMasterKey: true }); n += 1; }
    }
    console.log(`limpiados ${n}`); process.exit(0);
  }

  const alumnos: any[] = (await new Parse.Query('GrupoAlumno')
    .equalTo('grupo', gp).equalTo('exists', true as any).include('alumno')
    .limit(50).find({ useMasterKey: true })).map((v: any) => v.get('alumno'));
  const comps: any[] = await new Parse.Query('Competencia')
    .equalTo('coleccion', P('Coleccion', '9qc84pI5AC')).equalTo('exists', true as any)
    .ascending('orden').find({ useMasterKey: true });
  const preguntas: any[] = await new Parse.Query('Pregunta')
    .equalTo('coleccion', P('Coleccion', '9qc84pI5AC')).equalTo('exists', true as any)
    .include('competencia').find({ useMasterKey: true });

  const DiaEntrevistas: any = Parse.Object.extend('DiaEntrevistas');
  const CitaEntrevista: any = Parse.Object.extend('CitaEntrevista');
  const PreguntaAsignacion: any = Parse.Object.extend('PreguntaAsignacion');
  const EvidenciaCompetencia: any = Parse.Object.extend('EvidenciaCompetencia');

  // Dos jornadas de verificación: una ayer (ya ocurrió) y otra la semana que viene.
  const jornadas = [
    { inicio: dia(-1, 9), fin: dia(-1, 13), nota: 'Sala de capacitación · Nave 2' },
    { inicio: dia(6, 9), fin: dia(6, 13), nota: 'Sala de capacitación · Nave 2' },
  ];
  const dias: any[] = [];
  for (const j of jornadas) {
    const d = new DiaEntrevistas();
    d.set('grupo', gp); d.set('inicio', j.inicio); d.set('fin', j.fin);
    d.set('duracionSegundos', 600); d.set('nota', j.nota); d.set('cerrado', false);
    d.set('active', true); d.set('exists', true);
    await d.save(null, { useMasterKey: true });
    dias.push(d);
  }

  // Citas: 6 en la jornada pasada, 4 en la próxima.
  let creadas = 0; let asignadas = 0;
  const reparto = [
    [0, 0, 0], [1, 1, 0], [2, 2, 0], [3, 3, 0], [4, 4, 0], [5, 5, 0],
    [6, 0, 1], [7, 1, 1], [8, 2, 1], [9, 3, 1],
  ];
  for (const [iAlumno, iComp, iDia] of reparto) {
    const alumno = alumnos[iAlumno]; const comp = comps[iComp]; const d = dias[iDia];
    if (!alumno || !comp || !d) continue;
    const inicio = new Date(d.get('inicio').getTime() + creadas % 6 * 20 * 60 * 1000);
    const c = new CitaEntrevista();
    c.set('grupo', gp); c.set('dia', P('DiaEntrevistas', d.id));
    c.set('alumno', P('AppUser', alumno.id));
    c.set('competencia', P('Competencia', comp.id));
    c.set('inicio', inicio);
    c.set('active', true); c.set('exists', true);
    await c.save(null, { useMasterKey: true });
    creadas += 1;

    const preg = preguntas.find((p) => p.get('competencia')?.id === comp.id);
    if (preg) {
      const a = new PreguntaAsignacion();
      a.set('grupo', gp); a.set('alumno', P('AppUser', alumno.id));
      a.set('pregunta', P('Pregunta', preg.id)); a.set('intento', 1);
      a.set('usada', iDia === 0); a.set('active', true); a.set('exists', true);
      await a.save(null, { useMasterKey: true });
      asignadas += 1;
    }

    // Evidencias en las tres primeras: es lo que se enseña en el vídeo.
    if (creadas <= 3) {
      for (const [titulo, url] of [
        ['Checklist de bloqueo firmado', 'https://ejemplo.com/loto/checklist-linea3.pdf'],
        ['Fotografía del punto bloqueado', 'https://ejemplo.com/loto/punto-bloqueado.jpg'],
      ]) {
        const e = new EvidenciaCompetencia();
        e.set('grupo', gp); e.set('alumno', P('AppUser', alumno.id));
        e.set('competencia', P('Competencia', comp.id));
        e.set('cita', P('CitaEntrevista', c.id));
        e.set('origen', 'entrevista'); e.set('url', url); e.set('titulo', titulo);
        e.set('active', true); e.set('exists', true);
        await e.save(null, { useMasterKey: true });
      }
    }
  }
  console.log(`días: ${dias.length} · citas: ${creadas} · preguntas asignadas: ${asignadas}`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
