/**
 * Seed idempotente de ejercicios básicos para el módulo "Ejercicios" (mini-juez),
 * basado en las presentaciones de Kotlin/Android y Swift/iOS. Crea CATEGORÍAS y
 * EJERCICIOS bilingües (Kotlin + Swift) de nociones básicas.
 *
 * Los ejercicios cuentan UNA historia progresiva (la detective Vega resuelve el
 * homicidio de Damián Ríos): cada uno avanza un poco la narrativa y reutiliza
 * nombres. El título viene como "Tema - Escena" para que el alumno vea el concepto.
 * Cada enunciado trae la narrativa, el concepto y una sección de teoría con la
 * sintaxis en ambos lenguajes (casi copy-paste).
 *
 * Uso:
 *   ./node_modules/.bin/tsx scripts/seed-ejercicios-moviles.ts [slugColeccion]
 * (slug por defecto: tc2007b). Re-ejecutable: hace upsert por slug, no duplica.
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
  titulo: string; // "Tema - Escena"
  categoria: string;
  narrativa: string; // avanza la historia
  concepto: string;
  teoria: string;
  tarea: string;
  codigoInicial: { kotlin?: string; swift?: string };
  lenguajes?: ('kotlin' | 'swift')[]; // ausente = ambos; presente = exclusivo
  casos: Caso[];
}

const CATEGORIAS = [
  'Sintaxis básica',
  'Funciones y control de flujo',
  'Colecciones',
  'Programación funcional',
  'Nulos y opcionales',
];

function enunciado(e: Ejercicio): string {
  return [
    `# ${e.titulo}`,
    '',
    `_${e.narrativa}_`,
    '',
    `> **Concepto que practicas:** ${e.concepto}`,
    '',
    '## 📖 Teoría',
    '',
    e.teoria,
    '',
    '## 🎯 Tu tarea',
    '',
    e.tarea,
  ].join('\n');
}

const EJERCICIOS: Ejercicio[] = [
  {
    slug: 'hola-mundo',
    titulo: 'Salida en consola - El caso comienza',
    categoria: 'Sintaxis básica',
    narrativa: 'Amanece en el muelle. El empresario **Damián Ríos** apareció sin vida en la bodega 7. La detective **Vega** abre el expediente y enciende la terminal del caso.',
    concepto: 'imprimir en consola (tu primer programa).',
    teoria: [
      'Para mostrar texto en la consola se usa una función de impresión que además agrega un salto de línea al final.',
      '',
      '**Kotlin**',
      '```kotlin',
      'println("Texto a mostrar")',
      '```',
      '**Swift**',
      '```swift',
      'print("Texto a mostrar")',
      '```',
    ].join('\n'),
    tarea: 'Imprime **exactamente** la línea con la que Vega abre el registro del caso:\n\n```\nCaso 0451: homicidio en la bodega 7.\n```',
    codigoInicial: {
      kotlin: 'fun main() {\n    // Imprime la línea de apertura del caso\n}\n',
      swift: '// Imprime la línea de apertura del caso\n',
    },
    casos: [{ entrada: '', salidaEsperada: 'Caso 0451: homicidio en la bodega 7.', oculto: false }],
  },
  {
    slug: 'ficha-sospechoso',
    titulo: 'Variables - La ficha del sospechoso',
    categoria: 'Sintaxis básica',
    narrativa: 'El primer sospechoso es **Marco Peña**, el vigilante nocturno que "no vio nada". Vega registra su ficha para empezar a atar cabos.',
    concepto: 'variables, leer entrada e interpolar valores en un texto.',
    teoria: [
      'Se leen datos línea por línea, se convierten al tipo necesario y se **interpolan** dentro de un texto.',
      '',
      '**Kotlin** — `readLine()` lee una línea; `$variable` la inserta; `.toInt()` convierte a entero:',
      '```kotlin',
      'val nombre = readLine()!!.trim()',
      'val edad = readLine()!!.trim().toInt()',
      'println("Nombre: $nombre, edad: $edad")',
      '```',
      '**Swift** — `readLine()` lee una línea; `\\(variable)` la inserta; `Int(...)!` convierte:',
      '```swift',
      'let nombre = readLine()!',
      'let edad = Int(readLine()!)!',
      'print("Nombre: \\(nombre), edad: \\(edad)")',
      '```',
    ].join('\n'),
    tarea: [
      'Lee **dos líneas**: el `nombre` del sospechoso y su `edad` (entero). Imprime la ficha:',
      '',
      '```',
      'Sospechoso: <nombre> (<edad> años)',
      '```',
      '',
      'Ejemplo — entrada `Marco Peña` / `47` → `Sospechoso: Marco Peña (47 años)`.',
    ].join('\n'),
    codigoInicial: {
      kotlin: 'fun main() {\n    val nombre = readLine()!!.trim()\n    val edad = readLine()!!.trim().toInt()\n    // Imprime la ficha con el formato pedido\n}\n',
      swift: 'let nombre = readLine()!\nlet edad = Int(readLine()!)!\n// Imprime la ficha con el formato pedido\n',
    },
    casos: [
      { entrada: 'Marco Peña\n47\n', salidaEsperada: 'Sospechoso: Marco Peña (47 años)', oculto: false },
      { entrada: 'Elena Cruz\n35\n', salidaEsperada: 'Sospechoso: Elena Cruz (35 años)', oculto: true },
    ],
  },
  {
    slug: 'calcular-condena',
    titulo: 'Funciones - Calcular la condena',
    categoria: 'Funciones y control de flujo',
    narrativa: 'Si se comprueba la culpa de Marco, habrá que fijar la condena. Vega estima la pena según la gravedad del delito.',
    concepto: 'funciones que devuelven un valor y selección múltiple (when / switch).',
    teoria: [
      'Una función recibe parámetros y **devuelve** un valor. Para elegir entre varios casos se usa `when` (Kotlin) o `switch` (Swift).',
      '',
      '**Kotlin**',
      '```kotlin',
      'fun clasificar(x: Int): String {',
      '    return when (x) {',
      '        1 -> "uno"',
      '        2 -> "dos"',
      '        else -> "otro"',
      '    }',
      '}',
      '```',
      '**Swift**',
      '```swift',
      'func clasificar(_ x: Int) -> String {',
      '    switch x {',
      '    case 1: return "uno"',
      '    case 2: return "dos"',
      '    default: return "otro"',
      '    }',
      '}',
      '```',
    ].join('\n'),
    tarea: [
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
    titulo: 'Condicionales - Prioridad de la evidencia',
    categoria: 'Funciones y control de flujo',
    narrativa: 'La escena está llena de indicios. Antes de procesarlos, Vega los clasifica por prioridad según cuántos hay.',
    concepto: 'condicionales con rangos (if / else if / else).',
    teoria: [
      'Con `if` / `else if` / `else` decides qué hacer según una condición. Los operadores de comparación (`<`, `<=`, `>`) son iguales en ambos lenguajes.',
      '',
      '**Kotlin**',
      '```kotlin',
      'if (n < 3) {',
      '    println("Bajo")',
      '} else if (n <= 6) {',
      '    println("Medio")',
      '} else {',
      '    println("Alto")',
      '}',
      '```',
      '**Swift** (sin paréntesis en la condición)',
      '```swift',
      'if n < 3 {',
      '    print("Bajo")',
      '} else if n <= 6 {',
      '    print("Medio")',
      '} else {',
      '    print("Alto")',
      '}',
      '```',
    ].join('\n'),
    tarea: [
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
    titulo: 'Listas - La bolsa de evidencias',
    categoria: 'Colecciones',
    narrativa: 'En la bolsa de evidencias podría estar el arma homicida. Vega busca el `Arma Calibre 45` entre lo recolectado.',
    concepto: 'listas: partir un texto y buscar un elemento (contains).',
    teoria: [
      '`split` parte un texto en una lista usando un separador; `contains` dice si un elemento está en ella.',
      '',
      '**Kotlin**',
      '```kotlin',
      'val lista = readLine()!!.split(",")   // ["a", "b", "c"]',
      'if (lista.contains("b")) println("sí")',
      '```',
      '**Swift** — `split` devuelve subcadenas; conviene mapearlas a `String`:',
      '```swift',
      'let lista = readLine()!.split(separator: ",").map { String($0) }',
      'if lista.contains("b") { print("sí") }',
      '```',
    ].join('\n'),
    tarea: [
      'Primera línea: las evidencias de la bolsa, separadas por comas. Segunda línea: la evidencia a buscar.',
      'Imprime `Encontrada` si está en la bolsa, o `No encontrada` si no.',
      '',
      'Ejemplo — `Guante,Arma Calibre 45,Colilla` / `Arma Calibre 45` → `Encontrada`.',
    ].join('\n'),
    codigoInicial: {
      kotlin: 'fun main() {\n    val bolsa = readLine()!!.split(",")\n    val objetivo = readLine()!!.trim()\n    // ¿objetivo está en la bolsa? Imprime Encontrada / No encontrada\n}\n',
      swift: 'let bolsa = readLine()!.split(separator: ",").map { String($0) }\nlet objetivo = readLine()!\n// ¿objetivo está en la bolsa? Imprime Encontrada / No encontrada\n',
    },
    casos: [
      { entrada: 'Guante,Arma Calibre 45,Colilla\nArma Calibre 45\n', salidaEsperada: 'Encontrada', oculto: false },
      { entrada: 'Guante,Colilla\nArma Calibre 45\n', salidaEsperada: 'No encontrada', oculto: false },
      { entrada: 'Cabello,Sangre,Zapato\nZapato\n', salidaEsperada: 'Encontrada', oculto: true },
    ],
  },
  {
    slug: 'evidencias-unicas',
    titulo: 'Conjuntos - Evidencias sin repetir',
    categoria: 'Colecciones',
    narrativa: 'El equipo etiquetó evidencias a las prisas y hay duplicados. Vega necesita saber cuántas son **realmente distintas**.',
    concepto: 'conjuntos (Set) para quedarte con elementos distintos.',
    teoria: [
      'Un **Set** guarda elementos sin repetir. Convertir una lista a Set y medir su tamaño da la cantidad de elementos distintos.',
      '',
      '**Kotlin**',
      '```kotlin',
      'val lista = readLine()!!.trim().split(" ")',
      'println(lista.toSet().size)',
      '```',
      '**Swift**',
      '```swift',
      'let lista = readLine()!.split(separator: " ").map { String($0) }',
      'print(Set(lista).count)',
      '```',
    ].join('\n'),
    tarea: [
      'Lee una línea con evidencias (una palabra cada una) separadas por espacio; pueden repetirse. Imprime **cuántas son distintas**.',
      '',
      'Ejemplo — `Guante Colilla Guante Cabello` → `3`.',
    ].join('\n'),
    codigoInicial: {
      kotlin: 'fun main() {\n    val evidencias = readLine()!!.trim().split(" ")\n    // Imprime cuántas son distintas (pista: un Set)\n}\n',
      swift: 'let evidencias = readLine()!.split(separator: " ").map { String($0) }\n// Imprime cuántas son distintas (pista: un Set)\n',
    },
    casos: [
      { entrada: 'Guante Colilla Guante Cabello\n', salidaEsperada: '3', oculto: false },
      { entrada: 'Ceniza Ceniza Ceniza\n', salidaEsperada: '1', oculto: true },
    ],
  },
  {
    slug: 'casos-pares',
    titulo: 'Programación funcional - Celdas disponibles',
    categoria: 'Programación funcional',
    narrativa: 'Con varios detenidos por interrogar, Vega revisa qué celdas están libres. Por reglamento, solo las de número **par** pueden usarse esta noche.',
    concepto: 'programación funcional: filtrar una colección con filter.',
    teoria: [
      '`filter` construye una nueva lista con los elementos que cumplen una condición, sin escribir un bucle a mano.',
      '',
      '**Kotlin** — dentro de la lambda, `it` es cada elemento; `joinToString` une con un separador:',
      '```kotlin',
      'val pares = nums.filter { it % 2 == 0 }',
      'println(pares.joinToString(" "))',
      '```',
      '**Swift** — `$0` es cada elemento; se mapea a `String` y se une con `joined`:',
      '```swift',
      'let pares = nums.filter { $0 % 2 == 0 }',
      'print(pares.map(String.init).joined(separator: " "))',
      '```',
    ].join('\n'),
    tarea: [
      'Lee una línea con los números de celda (enteros separados por espacio) e imprime **solo las pares**, en el mismo orden, separadas por un espacio.',
      '',
      'Ejemplo — `12 19 48 93 7` → `12 48`.',
    ].join('\n'),
    codigoInicial: {
      kotlin: 'fun main() {\n    val celdas = readLine()!!.trim().split(" ").map { it.toInt() }\n    // Filtra las pares e imprímelas separadas por espacio\n}\n',
      swift: 'let celdas = readLine()!.split(separator: " ").map { Int($0)! }\n// Filtra las pares e imprímelas separadas por espacio\n',
    },
    casos: [
      { entrada: '12 19 48 93 7\n', salidaEsperada: '12 48', oculto: false },
      { entrada: '2 4 6 7\n', salidaEsperada: '2 4 6', oculto: true },
    ],
  },
  {
    slug: 'suma-condenas',
    titulo: 'Agregación - El veredicto final',
    categoria: 'Programación funcional',
    narrativa: 'El juicio llega a su fin. El arma y las pruebas señalan a **Marco Peña**. Vega suma los años de todos los cargos para conocer la condena total. **Caso cerrado.**',
    concepto: 'agregación: reducir una colección a un solo valor (suma).',
    teoria: [
      'Sumar todos los elementos de una lista es una **reducción**. Ambos lenguajes lo ofrecen listo.',
      '',
      '**Kotlin** — `sum()` sobre una lista de enteros:',
      '```kotlin',
      'println(nums.sum())',
      '```',
      '**Swift** — `reduce(0, +)` acumula desde 0 con la suma:',
      '```swift',
      'print(nums.reduce(0, +))',
      '```',
    ].join('\n'),
    tarea: [
      'Lee una línea con los años de cada cargo (enteros separados por espacio) e imprime la **condena total**.',
      '',
      'Ejemplo — `2 3 5` → `10`.',
    ].join('\n'),
    codigoInicial: {
      kotlin: 'fun main() {\n    val cargos = readLine()!!.trim().split(" ").map { it.toInt() }\n    // Imprime la suma total\n}\n',
      swift: 'let cargos = readLine()!.split(separator: " ").map { Int($0)! }\n// Imprime la suma total\n',
    },
    casos: [
      { entrada: '2 3 5\n', salidaEsperada: '10', oculto: false },
      { entrada: '100 200\n', salidaEsperada: '300', oculto: true },
    ],
  },

  // --- Exclusivos por lenguaje: el mismo problema, sintaxis propia de cada uno ---
  {
    slug: 'testigo-nulo-kotlin',
    titulo: 'Seguridad a nulo - El testigo fantasma (Kotlin)',
    categoria: 'Nulos y opcionales',
    lenguajes: ['kotlin'],
    narrativa: 'Un testigo dejó una nota con su edad, pero a veces el dato falta (`?`). En **Kotlin**, Vega maneja el posible nulo sin que el programa truene.',
    concepto: 'seguridad a nulo en Kotlin: tipos nullables y el operador Elvis (`?:`).',
    teoria: [
      'En Kotlin una variable **no** puede ser nula salvo que su tipo lleve `?`. Para dar un valor por defecto cuando algo es nulo se usa el **operador Elvis** `?:`.',
      '',
      '```kotlin',
      'val edad: Int? = readLine()!!.trim().toIntOrNull() // null si no es número',
      'val segura = edad ?: 0   // si es null, usa 0',
      'println(segura)',
      '```',
      '',
      'Otros: `?.` (llamada segura) y `!!` (forzar no-nulo, lanza excepción si es null — úsalo poco).',
    ].join('\n'),
    tarea: [
      'Lee una línea con la edad del testigo. Si **no** es un número (dato ausente), imprime `0`; si lo es, imprime la edad.',
      '',
      'Ejemplo — entrada `?` → `0`; entrada `42` → `42`.',
    ].join('\n'),
    codigoInicial: {
      kotlin: 'fun main() {\n    val entrada = readLine()!!.trim()\n    // Usa toIntOrNull() y el operador Elvis (?:) para imprimir la edad o 0\n}\n',
    },
    casos: [
      { entrada: '42\n', salidaEsperada: '42', oculto: false },
      { entrada: '?\n', salidaEsperada: '0', oculto: false },
      { entrada: 'sin dato\n', salidaEsperada: '0', oculto: true },
    ],
  },
  {
    slug: 'testigo-opcional-swift',
    titulo: 'Optionals - El testigo fantasma (Swift)',
    categoria: 'Nulos y opcionales',
    lenguajes: ['swift'],
    narrativa: 'Un testigo dejó una nota con su edad, pero a veces el dato falta. En **Swift**, Vega usa un *optional* para manejar la ausencia con seguridad.',
    concepto: 'optionals en Swift: valor opcional y el operador nil-coalescing (`??`).',
    teoria: [
      'En Swift un valor que puede faltar es un **optional** (tipo con `?`). `Int("texto")` devuelve `Int?` (`nil` si no es número). El operador `??` da un valor por defecto cuando es `nil`.',
      '',
      '```swift',
      'let edad: Int? = Int(readLine()!)   // nil si no es número',
      'let segura = edad ?? 0              // si es nil, usa 0',
      'print(segura)',
      '```',
      '',
      'También puedes desenvolver con `if let edad = edad { ... }` para usar el valor solo cuando existe.',
    ].join('\n'),
    tarea: [
      'Lee una línea con la edad del testigo. Si **no** es un número (dato ausente), imprime `0`; si lo es, imprime la edad.',
      '',
      'Ejemplo — entrada `?` → `0`; entrada `42` → `42`.',
    ].join('\n'),
    codigoInicial: {
      swift: 'let entrada = readLine()!\n// Usa Int(...) y el operador ?? para imprimir la edad o 0\n',
    },
    casos: [
      { entrada: '42\n', salidaEsperada: '42', oculto: false },
      { entrada: '?\n', salidaEsperada: '0', oculto: false },
      { entrada: 'sin dato\n', salidaEsperada: '0', oculto: true },
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

  const EjModel = Parse.Object.extend('EjercicioProgramacion');
  let orden = 0;
  for (const d of EJERCICIOS) {
    const md = enunciado(d);
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
    ej!.set('enunciado', md);
    ej!.set('enunciadoHtml', await renderMarkdown(md));
    ej!.set('lenguajes', d.lenguajes ?? ['kotlin', 'swift']);
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
    console.log(`  ${nuevo ? 'creado ' : 'actualizado'}: ${d.titulo} (/${d.slug})`);
  }

  console.log(`\nListo: ${CATEGORIAS.length} categorías, ${EJERCICIOS.length} ejercicios (Kotlin + Swift), narrativa progresiva.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
