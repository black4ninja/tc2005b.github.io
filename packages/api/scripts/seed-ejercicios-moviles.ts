/**
 * Seed idempotente de ejercicios básicos para el módulo "Ejercicios" (mini-juez),
 * basado en las presentaciones de Kotlin/Android y Swift/iOS (tema detective).
 * Crea CATEGORÍAS y EJERCICIOS bilingües (Kotlin + Swift) de nociones básicas.
 *
 * Uso:
 *   ./node_modules/.bin/tsx scripts/seed-ejercicios-moviles.ts [slugColeccion]
 * (slug por defecto: tc2007b). Re-ejecutable: hace upsert por slug, no duplica.
 * Los ejercicios se crean PUBLICADOS. Recuerda: solo se ven si el grupo tiene el
 * módulo 'ejercicios' encendido para esa colección (opt-in).
 */
import Parse from 'parse/node';
import { renderMarkdown } from '@tc2005b/contenido-pipeline';
import { config } from '../src/config/index.js';
import '../src/models/index.js';

Parse.initialize(config.appId);
(Parse as any).serverURL = config.serverURL;
(Parse as any).masterKey = config.masterKey;

const SLUG_COLECCION = process.argv[2] || 'tc2007b';

interface Caso { entrada: string; salidaEsperada: string; oculto: boolean }
interface Ejercicio {
  slug: string;
  titulo: string;
  categoria: string; // nombre de la categoría
  enunciado: string;
  codigoInicial: { kotlin: string; swift: string };
  casos: Caso[];
}

const CATEGORIAS = ['Sintaxis básica', 'Funciones y control de flujo', 'Colecciones', 'Programación funcional'];

const EJERCICIOS: Ejercicio[] = [
  {
    slug: 'hola-mundo',
    titulo: 'Hola, mundo',
    categoria: 'Sintaxis básica',
    enunciado: [
      '# Hola, mundo',
      '',
      'Tu primer programa. Imprime exactamente `Hola, mundo!` (sin comillas) y un salto de línea.',
      '',
      'No recibe entrada.',
    ].join('\n'),
    codigoInicial: {
      kotlin: 'fun main() {\n    // Imprime exactamente: Hola, mundo!\n}\n',
      swift: '// Imprime exactamente: Hola, mundo!\n',
    },
    casos: [{ entrada: '', salidaEsperada: 'Hola, mundo!', oculto: false }],
  },
  {
    slug: 'ficha-sospechoso',
    titulo: 'Ficha del sospechoso',
    categoria: 'Sintaxis básica',
    enunciado: [
      '# Ficha del sospechoso',
      '',
      'Lee **dos líneas**: el `nombre` (texto) y la `edad` (entero). Imprime:',
      '',
      '```',
      'Sospechoso: <nombre> (<edad> años)',
      '```',
      '',
      '**Ejemplo** — entrada `Juan Pérez` / `34` produce `Sospechoso: Juan Pérez (34 años)`.',
    ].join('\n'),
    codigoInicial: {
      kotlin: 'fun main() {\n    val nombre = readLine()!!.trim()\n    val edad = readLine()!!.trim().toInt()\n    // Imprime la ficha con el formato pedido\n}\n',
      swift: 'let nombre = readLine()!\nlet edad = Int(readLine()!)!\n// Imprime la ficha con el formato pedido\n',
    },
    casos: [
      { entrada: 'Juan Pérez\n34\n', salidaEsperada: 'Sospechoso: Juan Pérez (34 años)', oculto: false },
      { entrada: 'Ana\n28\n', salidaEsperada: 'Sospechoso: Ana (28 años)', oculto: true },
    ],
  },
  {
    slug: 'calcular-condena',
    titulo: 'Calcular la condena',
    categoria: 'Funciones y control de flujo',
    enunciado: [
      '# Calcular la condena',
      '',
      'Lee un entero con la **gravedad** del delito e imprime la condena:',
      '',
      '- `1` → `2 años`',
      '- `2` → `5 años`',
      '- `3` → `cadena perpetua`',
      '- cualquier otro → `sin clasificar`',
    ].join('\n'),
    codigoInicial: {
      kotlin: 'fun condena(gravedad: Int): String {\n    // Devuelve la condena según la gravedad\n    return ""\n}\n\nfun main() {\n    val g = readLine()!!.trim().toInt()\n    println(condena(g))\n}\n',
      swift: 'func condena(_ gravedad: Int) -> String {\n    // Devuelve la condena según la gravedad\n    return ""\n}\n\nlet g = Int(readLine()!)!\nprint(condena(g))\n',
    },
    casos: [
      { entrada: '1\n', salidaEsperada: '2 años', oculto: false },
      { entrada: '3\n', salidaEsperada: 'cadena perpetua', oculto: false },
      { entrada: '2\n', salidaEsperada: '5 años', oculto: true },
      { entrada: '7\n', salidaEsperada: 'sin clasificar', oculto: true },
    ],
  },
  {
    slug: 'prioridad-evidencia',
    titulo: 'Prioridad de la evidencia',
    categoria: 'Funciones y control de flujo',
    enunciado: [
      '# Prioridad de la evidencia',
      '',
      'Lee un entero con la **cantidad de piezas de evidencia** e imprime su prioridad:',
      '',
      '- menos de `3` → `Baja`',
      '- de `3` a `6` → `Media`',
      '- más de `6` → `Alta`',
    ].join('\n'),
    codigoInicial: {
      kotlin: 'fun main() {\n    val n = readLine()!!.trim().toInt()\n    // Imprime Baja, Media o Alta\n}\n',
      swift: 'let n = Int(readLine()!)!\n// Imprime Baja, Media o Alta\n',
    },
    casos: [
      { entrada: '2\n', salidaEsperada: 'Baja', oculto: false },
      { entrada: '5\n', salidaEsperada: 'Media', oculto: false },
      { entrada: '9\n', salidaEsperada: 'Alta', oculto: true },
      { entrada: '6\n', salidaEsperada: 'Media', oculto: true },
    ],
  },
  {
    slug: 'buscar-evidencia',
    titulo: 'Buscar evidencia',
    categoria: 'Colecciones',
    enunciado: [
      '# Buscar evidencia',
      '',
      'Primera línea: una lista de evidencias separadas por comas.',
      'Segunda línea: la evidencia a buscar.',
      '',
      'Imprime `Encontrada` si está en la lista, o `No encontrada` si no.',
      '',
      '**Ejemplo** — `Arma,Gorra,Sangre` / `Gorra` → `Encontrada`.',
    ].join('\n'),
    codigoInicial: {
      kotlin: 'fun main() {\n    val lista = readLine()!!.split(",")\n    val objetivo = readLine()!!.trim()\n    // ¿objetivo está en lista? Imprime Encontrada / No encontrada\n}\n',
      swift: 'let lista = readLine()!.split(separator: ",").map { String($0) }\nlet objetivo = readLine()!\n// ¿objetivo está en lista? Imprime Encontrada / No encontrada\n',
    },
    casos: [
      { entrada: 'Arma,Gorra,Sangre\nGorra\n', salidaEsperada: 'Encontrada', oculto: false },
      { entrada: 'Arma,Gorra\nCuchillo\n', salidaEsperada: 'No encontrada', oculto: false },
      { entrada: 'Huella,Sangre,Zapato\nZapato\n', salidaEsperada: 'Encontrada', oculto: true },
    ],
  },
  {
    slug: 'evidencias-unicas',
    titulo: 'Evidencias únicas',
    categoria: 'Colecciones',
    enunciado: [
      '# Evidencias únicas',
      '',
      'Lee una línea con evidencias separadas por espacio (pueden repetirse) e imprime',
      '**cuántas son distintas** (un número).',
      '',
      '**Ejemplo** — `Gorra Sangre Gorra Zapatos` → `3`.',
    ].join('\n'),
    codigoInicial: {
      kotlin: 'fun main() {\n    val evidencias = readLine()!!.trim().split(" ")\n    // Imprime cuántas son distintas (pista: un Set)\n}\n',
      swift: 'let evidencias = readLine()!.split(separator: " ").map { String($0) }\n// Imprime cuántas son distintas (pista: un Set)\n',
    },
    casos: [
      { entrada: 'Gorra Sangre Gorra Zapatos\n', salidaEsperada: '3', oculto: false },
      { entrada: 'Arma Arma Arma\n', salidaEsperada: '1', oculto: true },
    ],
  },
  {
    slug: 'casos-pares',
    titulo: 'Celdas pares',
    categoria: 'Programación funcional',
    enunciado: [
      '# Celdas pares',
      '',
      'Lee una línea con enteros separados por espacio e imprime **solo los pares**,',
      'en el mismo orden, separados por un espacio.',
      '',
      '**Ejemplo** — `12 19 48 93 7` → `12 48`.',
    ].join('\n'),
    codigoInicial: {
      kotlin: 'fun main() {\n    val nums = readLine()!!.trim().split(" ").map { it.toInt() }\n    // Filtra los pares e imprímelos separados por espacio\n}\n',
      swift: 'let nums = readLine()!.split(separator: " ").map { Int($0)! }\n// Filtra los pares e imprímelos separados por espacio\n',
    },
    casos: [
      { entrada: '12 19 48 93 7\n', salidaEsperada: '12 48', oculto: false },
      { entrada: '2 4 6 7\n', salidaEsperada: '2 4 6', oculto: true },
    ],
  },
  {
    slug: 'suma-condenas',
    titulo: 'Suma de condenas',
    categoria: 'Programación funcional',
    enunciado: [
      '# Suma de condenas',
      '',
      'Lee una línea con enteros separados por espacio (años de cada condena) e imprime su **suma total**.',
      '',
      '**Ejemplo** — `2 3 5` → `10`.',
    ].join('\n'),
    codigoInicial: {
      kotlin: 'fun main() {\n    val años = readLine()!!.trim().split(" ").map { it.toInt() }\n    // Imprime la suma total\n}\n',
      swift: 'let años = readLine()!.split(separator: " ").map { Int($0)! }\n// Imprime la suma total\n',
    },
    casos: [
      { entrada: '2 3 5\n', salidaEsperada: '10', oculto: false },
      { entrada: '100 200\n', salidaEsperada: '300', oculto: true },
    ],
  },
];

async function main() {
  const qc = new Parse.Query('Coleccion');
  qc.equalTo('slug', SLUG_COLECCION);
  qc.equalTo('exists', true);
  const col = await qc.first({ useMasterKey: true });
  if (!col) throw new Error(`No existe la colección con slug "${SLUG_COLECCION}"`);
  console.log(`Colección: ${col.get('clave') || ''} ${col.get('nombre')} (${SLUG_COLECCION})`);

  const qa = new Parse.Query('AppUser');
  qa.equalTo('userType', 'admin'); qa.equalTo('active', true);
  const autor = await qa.first({ useMasterKey: true });

  // Categorías (upsert por nombre dentro de la colección).
  const CatModel = Parse.Object.extend('CategoriaEjercicio');
  const catPorNombre = new Map<string, Parse.Object>();
  for (let i = 0; i < CATEGORIAS.length; i++) {
    const nombre = CATEGORIAS[i];
    const q = new Parse.Query('CategoriaEjercicio');
    q.equalTo('coleccion', col); q.equalTo('nombre', nombre); q.equalTo('exists', true);
    let cat = await q.first({ useMasterKey: true });
    if (!cat) { cat = new CatModel(); cat.set('active', true); cat.set('exists', true); cat.set('coleccion', col); cat.set('nombre', nombre); }
    cat.set('orden', i);
    await cat.save(null, { useMasterKey: true });
    catPorNombre.set(nombre, cat);
  }
  console.log(`Categorías: ${CATEGORIAS.join(', ')}`);

  // Ejercicios (upsert por slug).
  const EjModel = Parse.Object.extend('EjercicioProgramacion');
  let orden = 0;
  for (const d of EJERCICIOS) {
    const q = new Parse.Query('EjercicioProgramacion');
    q.equalTo('coleccion', col); q.equalTo('slug', d.slug); q.equalTo('exists', true);
    let ej = await q.first({ useMasterKey: true });
    const nuevo = !ej;
    if (!ej) { ej = new EjModel(); ej.set('active', true); ej.set('exists', true); }
    ej!.set('coleccion', col);
    ej!.set('categoria', catPorNombre.get(d.categoria));
    ej!.set('titulo', d.titulo);
    ej!.set('slug', d.slug);
    ej!.set('orden', orden++);
    ej!.set('enunciado', d.enunciado);
    ej!.set('enunciadoHtml', await renderMarkdown(d.enunciado));
    ej!.set('lenguajes', ['kotlin', 'swift']);
    ej!.set('codigoInicial', d.codigoInicial);
    ej!.set('modoEvaluacion', 'programa');
    ej!.set('plantillaCodigo', {});
    ej!.set('limiteTiempoMs', 5000);
    ej!.set('limiteMemoriaMb', 256);
    ej!.set('casos', d.casos);
    ej!.set('publicado', true);
    ej!.set('oculto', false);
    if (autor && nuevo) ej!.set('autor', autor);
    await ej!.save(null, { useMasterKey: true });
    console.log(`  ${nuevo ? 'creado ' : 'actualizado'}: [${d.categoria}] ${d.titulo} (/${d.slug})`);
  }

  console.log(`\nListo: ${CATEGORIAS.length} categorías, ${EJERCICIOS.length} ejercicios (Kotlin + Swift), publicados.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
