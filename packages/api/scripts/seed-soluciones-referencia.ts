/**
 * Carga las SOLUCIONES DE REFERENCIA de los ejercicios (ver JUEZ.md §7).
 *
 * Uso:
 *   ./node_modules/.bin/tsx scripts/seed-soluciones-referencia.ts [slugColeccion] [--dry-run]
 * (slug por defecto: tc2007b). Idempotente: hace upsert por slug del ejercicio.
 *
 * SIEMPRE verifica antes de escribir, y **solo guarda los ejercicios que quedan
 * limpios**: escribir una solución que no pasa dejaría el catálogo peor que
 * vacío, porque el verificador la daría por buena a futuro. Con `--dry-run` no
 * escribe nada.
 *
 * Cada lenguaje lleva DOS soluciones con estrategias DISTINTAS a propósito (p.
 * ej. `sum()` contra un bucle, `Set` contra `distinct`): dos soluciones que se
 * parecen no detectan casos sobreajustados, que es justo para lo que sirven.
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
} from '../src/services/ejercicios-verificacion.service.js';
import { lenguajeConfigurado, LENGUAJES, type Lenguaje } from '../src/services/judge/index.js';

Parse.initialize(config.appId);
(Parse as any).serverURL = config.serverURL;
(Parse as any).masterKey = config.masterKey;

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const SLUG_COLECCION = argv.find((a) => !a.startsWith('--')) || 'tc2007b';

type Soluciones = { kotlin?: string[]; swift?: string[] };

const SOLUCIONES: Record<string, Soluciones> = {
  'hola-mundo': {
    kotlin: [
      `fun main() {
    println("Caso 0451: homicidio en la bodega 7.")
}`,
      `fun main() {
    val caso = 451
    val bodega = 7
    println("Caso 0%d: homicidio en la bodega %d.".format(caso, bodega))
}`,
    ],
    swift: [
      `print("Caso 0451: homicidio en la bodega 7.")`,
      `let linea = "Caso 0451" + ": homicidio en la bodega " + String(7) + "."
print(linea)`,
    ],
  },

  'ficha-sospechoso': {
    kotlin: [
      `fun main() {
    val nombre = readLine()!!.trim()
    val edad = readLine()!!.trim().toInt()
    println("Sospechoso: $nombre ($edad años)")
}`,
      `fun main() {
    val nombre = readLine()!!.trim()
    val edad = readLine()!!.trim().toInt()
    println("Sospechoso: " + nombre + " (" + edad.toString() + " años)")
}`,
    ],
    swift: [
      `let nombre = readLine()!
let edad = Int(readLine()!)!
print("Sospechoso: \\(nombre) (\\(edad) años)")`,
      `let nombre = readLine()!
let edad = Int(readLine()!)!
print("Sospechoso: " + nombre + " (" + String(edad) + " años)")`,
    ],
  },

  'calcular-condena': {
    kotlin: [
      `fun condena(gravedad: Int): String {
    return when (gravedad) {
        1 -> "2 años"
        2 -> "5 años"
        3 -> "cadena perpetua"
        else -> "sin clasificar"
    }
}

fun main() {
    val g = readLine()!!.trim().toInt()
    println(condena(g))
}`,
      // Tabla en vez de when: misma respuesta por otro camino.
      `val TABLA = mapOf(1 to "2 años", 2 to "5 años", 3 to "cadena perpetua")

fun condena(gravedad: Int): String = TABLA[gravedad] ?: "sin clasificar"

fun main() {
    val g = readLine()!!.trim().toInt()
    println(condena(g))
}`,
    ],
    swift: [
      `func condena(_ gravedad: Int) -> String {
    switch gravedad {
    case 1: return "2 años"
    case 2: return "5 años"
    case 3: return "cadena perpetua"
    default: return "sin clasificar"
    }
}

let g = Int(readLine()!)!
print(condena(g))`,
      `let tabla = [1: "2 años", 2: "5 años", 3: "cadena perpetua"]

func condena(_ gravedad: Int) -> String {
    return tabla[gravedad] ?? "sin clasificar"
}

let g = Int(readLine()!)!
print(condena(g))`,
    ],
  },

  'prioridad-evidencia': {
    kotlin: [
      `fun main() {
    val n = readLine()!!.trim().toInt()
    if (n < 3) {
        println("Baja")
    } else if (n <= 6) {
        println("Media")
    } else {
        println("Alta")
    }
}`,
      `fun main() {
    val n = readLine()!!.trim().toInt()
    val prioridad = when {
        n in 3..6 -> "Media"
        n > 6 -> "Alta"
        else -> "Baja"
    }
    println(prioridad)
}`,
    ],
    swift: [
      `let n = Int(readLine()!)!
if n < 3 {
    print("Baja")
} else if n <= 6 {
    print("Media")
} else {
    print("Alta")
}`,
      `let n = Int(readLine()!)!
switch n {
case ..<3: print("Baja")
case 3...6: print("Media")
default: print("Alta")
}`,
    ],
  },

  'buscar-evidencia': {
    kotlin: [
      `fun main() {
    val bolsa = readLine()!!.split(",")
    val objetivo = readLine()!!.trim()
    println(if (bolsa.contains(objetivo)) "Encontrada" else "No encontrada")
}`,
      // Recorrido explícito en vez de contains.
      `fun main() {
    val bolsa = readLine()!!.split(",")
    val objetivo = readLine()!!.trim()
    var hallada = false
    for (e in bolsa) {
        if (e == objetivo) hallada = true
    }
    println(if (hallada) "Encontrada" else "No encontrada")
}`,
    ],
    swift: [
      `let bolsa = readLine()!.split(separator: ",").map { String($0) }
let objetivo = readLine()!
print(bolsa.contains(objetivo) ? "Encontrada" : "No encontrada")`,
      `let bolsa = readLine()!.split(separator: ",").map { String($0) }
let objetivo = readLine()!
var hallada = false
for e in bolsa where e == objetivo {
    hallada = true
}
print(hallada ? "Encontrada" : "No encontrada")`,
    ],
  },

  'evidencias-unicas': {
    kotlin: [
      `fun main() {
    val evidencias = readLine()!!.trim().split(" ")
    println(evidencias.toSet().size)
}`,
      `fun main() {
    val evidencias = readLine()!!.trim().split(" ")
    val vistas = mutableListOf<String>()
    for (e in evidencias) {
        if (!vistas.contains(e)) vistas.add(e)
    }
    println(vistas.size)
}`,
    ],
    swift: [
      `let evidencias = readLine()!.split(separator: " ").map { String($0) }
print(Set(evidencias).count)`,
      `let evidencias = readLine()!.split(separator: " ").map { String($0) }
var vistas: [String] = []
for e in evidencias where !vistas.contains(e) {
    vistas.append(e)
}
print(vistas.count)`,
    ],
  },

  'casos-pares': {
    kotlin: [
      `fun main() {
    val celdas = readLine()!!.trim().split(" ").map { it.toInt() }
    println(celdas.filter { it % 2 == 0 }.joinToString(" "))
}`,
      `fun main() {
    val celdas = readLine()!!.trim().split(" ").map { it.toInt() }
    val pares = mutableListOf<String>()
    for (c in celdas) {
        if (c % 2 == 0) pares.add(c.toString())
    }
    println(pares.joinToString(" "))
}`,
    ],
    swift: [
      `let celdas = readLine()!.split(separator: " ").map { Int($0)! }
print(celdas.filter { $0 % 2 == 0 }.map { String($0) }.joined(separator: " "))`,
      `let celdas = readLine()!.split(separator: " ").map { Int($0)! }
var pares: [String] = []
for c in celdas where c % 2 == 0 {
    pares.append(String(c))
}
print(pares.joined(separator: " "))`,
    ],
  },

  'suma-condenas': {
    kotlin: [
      `fun main() {
    val cargos = readLine()!!.trim().split(" ").map { it.toInt() }
    println(cargos.sum())
}`,
      `fun main() {
    val cargos = readLine()!!.trim().split(" ").map { it.toInt() }
    var total = 0
    for (c in cargos) total += c
    println(total)
}`,
    ],
    swift: [
      `let cargos = readLine()!.split(separator: " ").map { Int($0)! }
print(cargos.reduce(0, +))`,
      `let cargos = readLine()!.split(separator: " ").map { Int($0)! }
var total = 0
for c in cargos { total += c }
print(total)`,
    ],
  },

  'testigo-nulo-kotlin': {
    kotlin: [
      `fun main() {
    val entrada = readLine()!!.trim()
    println(entrada.toIntOrNull() ?: 0)
}`,
      `fun main() {
    val entrada = readLine()!!.trim()
    val edad = try {
        entrada.toInt()
    } catch (e: NumberFormatException) {
        0
    }
    println(edad)
}`,
    ],
  },

  'testigo-opcional-swift': {
    swift: [
      `let entrada = readLine()!
print(Int(entrada) ?? 0)`,
      `let entrada = readLine()!
if let edad = Int(entrada) {
    print(edad)
} else {
    print(0)
}`,
    ],
  },
};

function aVerificable(ej: EjercicioProgramacion, soluciones: Soluciones): EjercicioVerificable {
  return {
    slug: ej.getSlug(),
    titulo: ej.getTitulo(),
    publicado: ej.getPublicado(),
    lenguajes: ej.getLenguajes().filter((l): l is Lenguaje => (LENGUAJES as readonly string[]).includes(l)),
    modoEvaluacion: ej.getModoEvaluacion(),
    plantillaCodigo: ej.getPlantillaCodigo(),
    codigoInicial: ej.getCodigoInicial(),
    solucionesReferencia: soluciones,
    casos: ej.getCasos(),
    limiteTiempoMs: ej.getLimiteTiempoMs(),
    limiteMemoriaMb: ej.getLimiteMemoriaMb(),
  };
}

async function main(): Promise<void> {
  const disponibles = LENGUAJES.filter(lenguajeConfigurado);
  if (disponibles.length < LENGUAJES.length) {
    console.error(
      `Falta toolchain de: ${LENGUAJES.filter((l) => !disponibles.includes(l)).join(', ')}.\n` +
        'Sin él no se puede garantizar que las soluciones pasen. Ver JUEZ.md §6.',
    );
    process.exit(1);
  }

  const qc = new Parse.Query<Coleccion>('Coleccion');
  qc.equalTo('slug' as any, SLUG_COLECCION as any);
  const coleccion = await qc.first({ useMasterKey: true });
  if (!coleccion) {
    console.error(`No existe la colección '${SLUG_COLECCION}'.`);
    process.exit(1);
  }

  const q = new Parse.Query<EjercicioProgramacion>('EjercicioProgramacion');
  q.equalTo('coleccion' as any, coleccion as any);
  q.equalTo('exists' as any, true as any);
  q.ascending('orden');
  q.limit(1000);
  const ejercicios = await q.find({ useMasterKey: true });

  console.log(`${ejercicios.length} ejercicios en '${SLUG_COLECCION}'${DRY_RUN ? ' · DRY-RUN, no se escribe' : ''}\n`);

  let guardados = 0;
  let conProblemas = 0;
  let sinSoluciones = 0;

  for (const ej of ejercicios) {
    const slug = ej.getSlug();
    const soluciones = SOLUCIONES[slug];
    if (!soluciones) {
      console.log(`· ${slug}: sin soluciones en este script, se omite`);
      sinSoluciones++;
      continue;
    }

    const verificable = aVerificable(ej, soluciones);
    const hallazgos = [
      ...revisarEstructura(verificable),
      ...(await revisarEjecucion(verificable)),
    ];
    const errores = hallazgos.filter((h) => h.nivel === 'error');

    if (errores.length) {
      conProblemas++;
      console.log(`✗ ${slug}`);
      for (const h of errores) console.log(`    ${h.lenguaje ? `[${h.lenguaje}] ` : ''}${h.mensaje}`);
      console.log('    → NO se guarda: una solución que no pasa es peor que ninguna.');
      continue;
    }

    const avisos = hallazgos.filter((h) => h.nivel === 'aviso');
    console.log(`✓ ${slug}${avisos.length ? ` (${avisos.length} avisos)` : ''}`);
    for (const h of avisos) console.log(`    aviso: ${h.lenguaje ? `[${h.lenguaje}] ` : ''}${h.mensaje}`);

    if (!DRY_RUN) {
      ej.setSolucionesReferencia(soluciones);
      await ej.save(null, { useMasterKey: true });
      guardados++;
    }
  }

  console.log(
    `\n${DRY_RUN ? 'Verificados' : 'Guardados'}: ${DRY_RUN ? ejercicios.length - conProblemas - sinSoluciones : guardados}` +
      ` · con problemas: ${conProblemas} · sin soluciones definidas: ${sinSoluciones}`,
  );
  process.exit(conProblemas > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
