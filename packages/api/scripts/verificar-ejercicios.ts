/**
 * Verificador en LOTE de los ejercicios del mini-juez. La lógica vive en
 * `src/services/ejercicios-verificacion.service.ts`; esto es la CLI.
 *
 * Uso:
 *   ./node_modules/.bin/tsx scripts/verificar-ejercicios.ts [slugColeccion]
 *       [--slug <ejSlug>]         solo ese ejercicio
 *       [--lenguaje kotlin|swift] solo ese lenguaje
 *       [--publicados]            ignora los borradores
 *       [--rapido]                solo chequeos estructurales (no compila nada)
 *       [--json]                  salida JSON para encadenar
 * (slug de colección por defecto: tc2007b)
 *
 * Solo LEE de la BD. Sale con código 1 si hay algún ERROR (los avisos no
 * rompen), para poder usarlo como puerta antes de publicar.
 */
import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { EjercicioProgramacion } from '../src/models/EjercicioProgramacion.js';
import { Coleccion } from '../src/models/Coleccion.js';
import {
  revisarEstructura,
  revisarEjecucion,
  type EjercicioVerificable,
  type Hallazgo,
} from '../src/services/ejercicios-verificacion.service.js';
import { lenguajeConfigurado, LENGUAJES, type Lenguaje } from '../src/services/judge/index.js';

Parse.initialize(config.appId);
(Parse as any).serverURL = config.serverURL;
(Parse as any).masterKey = config.masterKey;

// --- Argumentos ---

const argv = process.argv.slice(2);
const CON_VALOR = new Set(['--slug', '--lenguaje']);
const banderas = new Set<string>();
const opciones = new Map<string, string>();
const posicionales: string[] = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (CON_VALOR.has(a)) opciones.set(a, argv[++i] ?? '');
  else if (a.startsWith('--')) banderas.add(a);
  else posicionales.push(a);
}

const SLUG_COLECCION = posicionales[0] || 'tc2007b';
const SOLO_SLUG = opciones.get('--slug');
const SOLO_LENGUAJE = opciones.get('--lenguaje') as Lenguaje | undefined;
const SOLO_PUBLICADOS = banderas.has('--publicados');
const RAPIDO = banderas.has('--rapido');
const JSON_OUT = banderas.has('--json');

if (SOLO_LENGUAJE && !(LENGUAJES as readonly string[]).includes(SOLO_LENGUAJE)) {
  console.error(`--lenguaje debe ser uno de: ${LENGUAJES.join(', ')}`);
  process.exit(1);
}

const COLOR = !!process.stdout.isTTY && !JSON_OUT;
const rojo = (s: string) => (COLOR ? `\x1b[31m${s}\x1b[0m` : s);
const amarillo = (s: string) => (COLOR ? `\x1b[33m${s}\x1b[0m` : s);
const verde = (s: string) => (COLOR ? `\x1b[32m${s}\x1b[0m` : s);
const gris = (s: string) => (COLOR ? `\x1b[90m${s}\x1b[0m` : s);

/** Modelo de Parse → objeto plano que entiende el verificador. */
function aVerificable(ej: EjercicioProgramacion): EjercicioVerificable {
  return {
    slug: ej.getSlug(),
    titulo: ej.getTitulo(),
    publicado: ej.getPublicado(),
    lenguajes: ej.getLenguajes().filter((l): l is Lenguaje =>
      (LENGUAJES as readonly string[]).includes(l)),
    modoEvaluacion: ej.getModoEvaluacion(),
    plantillaCodigo: ej.getPlantillaCodigo(),
    codigoInicial: ej.getCodigoInicial(),
    solucionesReferencia: ej.getSolucionesReferencia(),
    casos: ej.getCasos(),
    limiteTiempoMs: ej.getLimiteTiempoMs(),
    limiteMemoriaMb: ej.getLimiteMemoriaMb(),
  };
}

async function main(): Promise<void> {
  const qc = new Parse.Query<Coleccion>('Coleccion');
  qc.equalTo('slug' as any, SLUG_COLECCION as any);
  const coleccion = await qc.first({ useMasterKey: true });
  if (!coleccion) {
    console.error(`No existe la colección '${SLUG_COLECCION}'.`);
    process.exit(1);
  }

  const q = new Parse.Query<EjercicioProgramacion>('EjercicioProgramacion');
  q.equalTo('coleccion' as any, coleccion as any);
  // `exists` y no `active`: es el eje de borrado que usan las consultas del
  // controller admin, y el verificador tiene que ver el MISMO catálogo.
  q.equalTo('exists' as any, true as any);
  if (SOLO_SLUG) q.equalTo('slug' as any, SOLO_SLUG as any);
  if (SOLO_PUBLICADOS) q.equalTo('publicado' as any, true as any);
  q.ascending('orden');
  q.limit(1000);
  const ejercicios = await q.find({ useMasterKey: true });

  if (!ejercicios.length) {
    console.error(`Sin ejercicios que revisar en '${SLUG_COLECCION}'.`);
    process.exit(1);
  }

  // Solo se puede EJECUTAR lo que tenga toolchain; el resto se avisa UNA vez,
  // en vez de ensuciar cada ejercicio con el mismo aviso.
  const disponibles = LENGUAJES.filter(lenguajeConfigurado);
  const sinToolchain = LENGUAJES.filter((l) => !disponibles.includes(l));
  if (!RAPIDO && sinToolchain.length && !JSON_OUT) {
    console.log(gris(`Sin toolchain, no se ejecutan: ${sinToolchain.join(', ')}. Ver JUEZ.md §6.`));
  }

  const reportes: { slug: string; titulo: string; publicado: boolean; hallazgos: Hallazgo[] }[] = [];
  // Lenguajes que se declararon pero NO se llegaron a ejecutar. Se acumulan para
  // decirlo en el resumen: sin esto, un catálogo bilingüe en una máquina sin
  // kotlinc sale con "0 errores" habiendo comprobado solo la mitad, y "0 errores"
  // es justo lo que uno mira antes de publicar.
  const noVerificados = new Map<Lenguaje, number>();

  for (const ejParse of ejercicios) {
    const ej = aVerificable(ejParse);
    const objetivo = SOLO_LENGUAJE ? ej.lenguajes.filter((l) => l === SOLO_LENGUAJE) : ej.lenguajes;

    const hallazgos = revisarEstructura(ej, objetivo);
    if (!RAPIDO) {
      const ejecutables = objetivo.filter((l) => disponibles.includes(l));
      for (const l of objetivo) {
        if (!ejecutables.includes(l)) noVerificados.set(l, (noVerificados.get(l) ?? 0) + 1);
      }
      hallazgos.push(...(await revisarEjecucion(ej, ejecutables)));
    }
    reportes.push({ slug: ej.slug, titulo: ej.titulo, publicado: ej.publicado, hallazgos });

    if (!JSON_OUT) {
      const errores = hallazgos.filter((h) => h.nivel === 'error').length;
      const marca = errores ? rojo('✗') : hallazgos.length ? amarillo('!') : verde('✓');
      console.log(`${marca} ${ej.slug}${ej.publicado ? '' : gris(' [borrador]')} — ${ej.titulo}`);
      for (const h of hallazgos) {
        const pre = h.nivel === 'error' ? rojo('    error') : amarillo('    aviso');
        console.log(`${pre}: ${h.lenguaje ? gris(`[${h.lenguaje}] `) : ''}${h.mensaje}`);
      }
    }
  }

  const cuenta = (n: NivelFiltro) =>
    reportes.reduce((acc, r) => acc + r.hallazgos.filter((h) => h.nivel === n).length, 0);
  const totalErrores = cuenta('error');
  const totalAvisos = cuenta('aviso');
  const limpios = reportes.filter((r) => r.hallazgos.length === 0).length;

  const sinVerificar = [...noVerificados].map(([l, n]) => `${l} (${n})`);

  if (JSON_OUT) {
    console.log(JSON.stringify({
      coleccion: SLUG_COLECCION,
      reportes,
      totalErrores,
      totalAvisos,
      // Explícito en el JSON: un consumidor no debe leer totalErrores=0 como
      // "todo verificado" sin mirar esto.
      noVerificados: Object.fromEntries(noVerificados),
      soloEstructura: RAPIDO,
    }, null, 2));
  } else {
    console.log(
      `\n${reportes.length} ejercicios · ${verde(`${limpios} limpios`)} · ` +
        `${rojo(`${totalErrores} errores`)} · ${amarillo(`${totalAvisos} avisos`)}`,
    );
    if (RAPIDO) {
      console.log(amarillo('Modo --rapido: NO se compiló nada; los chequeos de ejecución no corrieron.'));
    } else if (sinVerificar.length) {
      console.log(amarillo(`Sin verificar por falta de toolchain: ${sinVerificar.join(', ')}. Ver JUEZ.md §6.`));
    }
  }
  process.exit(totalErrores > 0 ? 1 : 0);
}

type NivelFiltro = Hallazgo['nivel'];

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
