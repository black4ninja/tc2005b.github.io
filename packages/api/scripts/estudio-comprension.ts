/**
 * Instrumental para medir si los enunciados se entienden por sí solos.
 *
 * Tres subcomandos, que corresponden a los tres instrumentos del estudio:
 *
 *   exportar   Vuelca a disco EXACTAMENTE lo que ve un alumno de cada ejercicio:
 *              enunciado, código inicial, lenguajes y casos VISIBLES. Nada más.
 *              Ni soluciones, ni plantilla con el driver, ni casos ocultos.
 *
 *   juzgar     Evalúa un fichero de código candidato contra el ejercicio real,
 *              con el mismo juez y los mismos casos —incluidos los ocultos— que
 *              se aplican a un alumno. Imprime veredicto y primer caso fallido.
 *
 *   estatico   Métricas de carga cognitiva sobre los enunciados, sin ejecutar
 *              nada: longitud por sección, densidad de términos técnicos y
 *              referencias a otros ejercicios.
 *
 * Uso:
 *   tsx scripts/estudio-comprension.ts exportar <carpetaSalida> [coleccion]
 *   tsx scripts/estudio-comprension.ts juzgar <slug> <lenguaje> <fichero>
 *   tsx scripts/estudio-comprension.ts estatico [coleccion]
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { evaluar } from '../src/services/judge/index.js';
import { componerCodigo } from '../src/models/EjercicioProgramacion.js';

Parse.initialize(config.appId);
(Parse as any).serverURL = process.env.SERVER_URL || config.serverURL;
(Parse as any).masterKey = config.masterKey;

/** Slugs de la v1, que no forman parte del estudio. */
const V1 = new Set([
  'mvvm-modelo-dominio-android', 'mvvm-modelo-dominio-ios', 'mvvm-mapper-dto-dominio',
  'mvvm-contrato-repositorio', 'mvvm-id-desde-url', 'mvvm-caso-de-uso', 'mvvm-result-android',
  'mvvm-uistate-reducer-android', 'mvvm-viewmodel-android', 'mvvm-viewmodel-ios',
  'mvvm-composicion-android', 'mvvm-composicion-ios',
]);

async function cargar(slugColeccion: string): Promise<Parse.Object[]> {
  const col = await new Parse.Query('Coleccion')
    .equalTo('slug', slugColeccion).first({ useMasterKey: true });
  if (!col) throw new Error(`No existe la colección '${slugColeccion}'`);
  const q = new Parse.Query('EjercicioProgramacion');
  q.equalTo('coleccion', col).equalTo('exists', true).limit(500).ascending('orden');
  const todos = await q.find({ useMasterKey: true });
  return todos.filter((e) => {
    const s = String(e.get('slug'));
    return s.startsWith('mvvm') && !V1.has(s);
  });
}

/** Lo que ve un alumno. Cualquier campo de más aquí invalida el estudio. */
function vistaAlumno(e: Parse.Object): Record<string, unknown> {
  const casos = (e.get('casos') ?? []) as { entrada: string; salidaEsperada: string; oculto: boolean }[];
  return {
    slug: e.get('slug'),
    titulo: e.get('titulo'),
    lenguajes: e.get('lenguajes'),
    enunciado: e.get('enunciado'),
    codigoInicial: e.get('codigoInicial'),
    casosVisibles: casos.filter((c) => !c.oculto)
      .map((c) => ({ entrada: c.entrada, salidaEsperada: c.salidaEsperada })),
    numeroCasosOcultos: casos.filter((c) => c.oculto).length,
  };
}

async function exportar(carpeta: string, slugColeccion: string): Promise<void> {
  mkdirSync(carpeta, { recursive: true });
  const ejercicios = await cargar(slugColeccion);
  const indice: string[] = [];
  for (const e of ejercicios) {
    const v = vistaAlumno(e);
    writeFileSync(join(carpeta, `${v.slug}.json`), JSON.stringify(v, null, 2));
    indice.push(`${v.slug}\t${(v.lenguajes as string[]).join('+')}`);
  }
  writeFileSync(join(carpeta, 'INDICE.txt'), indice.join('\n') + '\n');
  console.log(`${ejercicios.length} ejercicios exportados a ${carpeta}`);
}

async function juzgar(slug: string, lenguaje: string, fichero: string): Promise<void> {
  const ej = await new Parse.Query('EjercicioProgramacion')
    .equalTo('slug', slug).equalTo('exists', true).first({ useMasterKey: true });
  if (!ej) throw new Error(`No existe el ejercicio '${slug}'`);

  const codigo = readFileSync(fichero, 'utf8');
  const plantilla = (ej.get('plantillaCodigo') ?? {})[lenguaje];
  const compuesto = componerCodigo(ej.get('modoEvaluacion'), plantilla, codigo);
  const casos = ej.get('casos') ?? [];
  const r = await evaluar({
    lenguaje: lenguaje as any,
    codigo: compuesto,
    casos,
    limites: { tiempoMs: ej.get('limiteTiempoMs'), memoriaMb: ej.get('limiteMemoriaMb') },
  });

  const primerFallo = r.casos.find((c: any) => !c.paso);
  console.log(JSON.stringify({
    slug, lenguaje,
    veredicto: r.veredicto,
    casos: `${r.casosPasados}/${r.casosTotales}`,
    // El primer caso que falla es lo que localiza la regla mal redactada.
    primerFallo: primerFallo ? {
      indice: primerFallo.indice,
      oculto: primerFallo.oculto,
      entrada: primerFallo.entrada,
      esperado: primerFallo.salidaEsperada,
      obtenido: primerFallo.salidaObtenida,
    } : null,
    errorCompilacion: r.errorCompilacion ? String(r.errorCompilacion).split('\n')[0] : null,
  }));
}

/** Términos que un enunciado no debería usar sin haberlos explicado antes. */
const TERMINOS = [
  'DTO', 'mapper', 'reducer', 'sealed', 'genérico', 'decorador', 'inyección',
  'contrato', 'inmutable', 'sticky', 'ARC', 'closure', 'protocolo', 'stub', 'spy',
];

async function estatico(slugColeccion: string): Promise<void> {
  const ejercicios = await cargar(slugColeccion);
  console.log(['slug', 'palabras', 'teoria%', 'terminos', 'sinDefinir', 'refs'].join('\t'));
  for (const e of ejercicios) {
    const md = String(e.get('enunciado') ?? '');
    const palabras = md.split(/\s+/).length;
    const teoria = (md.split('## De dónde viene')[1] ?? '').split('\n## ')[0];
    const pctTeoria = Math.round((teoria.split(/\s+/).length / palabras) * 100);

    // Un término cuenta como "sin definir" si aparece pero el enunciado nunca lo
    // explica: no está en negrita ni seguido de una aclaración con guion o dos
    // puntos. Es una heurística, pero señala dónde mirar.
    const usados = TERMINOS.filter((t) => new RegExp(`\\b${t}`, 'i').test(md));
    const sinDefinir = usados.filter((t) => {
      const def = new RegExp(`\\*\\*[^*]*${t}[^*]*\\*\\*|${t}[^.\\n]{0,40}[—:]`, 'i');
      return !def.test(md);
    });

    // Referencias a otros ejercicios: rompen la autosuficiencia si son necesarias.
    const refs = (md.match(/otro ejercicio|ejercicio anterior|nivel base/gi) ?? []).length;
    console.log([
      e.get('slug'), palabras, pctTeoria + '%', usados.length,
      sinDefinir.join(',') || '-', refs,
    ].join('\t'));
  }
}

const [cmd, ...args] = process.argv.slice(2);
try {
  if (cmd === 'exportar') await exportar(args[0], args[1] ?? 'tc2007b');
  else if (cmd === 'juzgar') await juzgar(args[0], args[1], args[2]);
  else if (cmd === 'estatico') await estatico(args[0] ?? 'tc2007b');
  else {
    console.error('Subcomandos: exportar <carpeta> | juzgar <slug> <lenguaje> <fichero> | estatico');
    process.exit(1);
  }
  process.exit(0);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
