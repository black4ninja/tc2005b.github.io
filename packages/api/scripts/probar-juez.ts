/**
 * Prueba de humo del juez: compila y ejecuta programas Kotlin y Swift reales y
 * verifica que el veredicto sea el esperado (AC / WA / TLE / error de
 * compilación), incluyendo un caso oculto. Es la forma de confirmar en el
 * SERVIDOR que ambos toolchains + bubblewrap funcionan.
 *
 * Uso (en el servidor, con el sandbox activo):
 *   JUEZ_SANDBOX=true \
 *   KOTLIN_HOME=/opt/kotlinc JAVA_HOME=/opt/jdk SWIFT_HOME=/opt/swift \
 *   ./node_modules/.bin/tsx scripts/probar-juez.ts
 *
 * En dev (macOS) corre sin sandbox si tienes kotlinc/swift instalados; los
 * lenguajes sin toolchain configurado se marcan OMITIDO.
 */
import { evaluar, lenguajeConfigurado, nombreLenguaje, type Caso, type Lenguaje, type Veredicto } from '../src/services/judge/index.js';

interface Prueba {
  nombre: string;
  lenguaje: Lenguaje;
  codigo: string;
  casos: Caso[];
  esperado: Veredicto;
  limites?: { tiempoMs?: number };
}

// --- Programas de referencia (suman dos enteros de stdin) ---

const KOTLIN_OK = `fun main() {
    val (a, b) = readLine()!!.trim().split(" ").map { it.toInt() }
    println(a + b)
}`;

const KOTLIN_WA = `fun main() {
    val (a, b) = readLine()!!.trim().split(" ").map { it.toInt() }
    println(a - b)
}`;

const KOTLIN_TLE = `fun main() {
    while (true) {}
}`;

const KOTLIN_COMPILA_MAL = `fun main( { println("x") }`;

const SWIFT_OK = `let parts = readLine()!.split(separator: " ")
let a = Int(parts[0])!
let b = Int(parts[1])!
print(a + b)`;

const SWIFT_WA = `let parts = readLine()!.split(separator: " ")
let a = Int(parts[0])!
let b = Int(parts[1])!
print(a - b)`;

const SWIFT_TLE = `while true {}`;

const SWIFT_COMPILA_MAL = `let x: = 3`;

// Un caso visible y uno oculto: 2+3=5, 10+20=30.
const CASOS_SUMA: Caso[] = [
  { entrada: '2 3\n', salidaEsperada: '5' },
  { entrada: '10 20\n', salidaEsperada: '30', oculto: true },
];

function pruebas(): Prueba[] {
  const lista: Prueba[] = [];
  for (const lenguaje of ['kotlin', 'swift'] as Lenguaje[]) {
    const ok = lenguaje === 'kotlin' ? KOTLIN_OK : SWIFT_OK;
    const wa = lenguaje === 'kotlin' ? KOTLIN_WA : SWIFT_WA;
    const tle = lenguaje === 'kotlin' ? KOTLIN_TLE : SWIFT_TLE;
    const mal = lenguaje === 'kotlin' ? KOTLIN_COMPILA_MAL : SWIFT_COMPILA_MAL;
    lista.push(
      { nombre: 'aceptado', lenguaje, codigo: ok, casos: CASOS_SUMA, esperado: 'aceptado' },
      { nombre: 'respuesta_incorrecta', lenguaje, codigo: wa, casos: CASOS_SUMA, esperado: 'respuesta_incorrecta' },
      { nombre: 'tiempo_excedido', lenguaje, codigo: tle, casos: [CASOS_SUMA[0]], esperado: 'tiempo_excedido', limites: { tiempoMs: 2000 } },
      { nombre: 'error_compilacion', lenguaje, codigo: mal, casos: CASOS_SUMA, esperado: 'error_compilacion' },
    );
  }
  return lista;
}

async function main() {
  const todas = pruebas();
  let fallos = 0;
  let corridas = 0;

  for (const lenguaje of ['kotlin', 'swift'] as Lenguaje[]) {
    console.log(`\n=== ${nombreLenguaje(lenguaje)} ===`);
    if (!lenguajeConfigurado(lenguaje)) {
      console.log(`  OMITIDO — falta configurar el toolchain (env ${lenguaje === 'kotlin' ? 'KOTLIN_HOME/JAVA_HOME' : 'SWIFT_HOME'}).`);
      continue;
    }
    for (const p of todas.filter((t) => t.lenguaje === lenguaje)) {
      corridas++;
      try {
        const r = await evaluar({ lenguaje, codigo: p.codigo, casos: p.casos, limites: p.limites });
        const ok = r.veredicto === p.esperado;
        if (!ok) fallos++;
        const marca = ok ? 'OK ' : 'FAIL';
        let extra = `${r.casosPasados}/${r.casosTotales}`;
        if (r.errorCompilacion) extra += ` — ${r.errorCompilacion.split('\n')[0].slice(0, 60)}`;
        console.log(`  [${marca}] ${p.nombre}: esperaba ${p.esperado}, obtuvo ${r.veredicto} (${extra})`);
      } catch (err) {
        fallos++;
        console.log(`  [FAIL] ${p.nombre}: excepción — ${(err as Error).message}`);
      }
    }
  }

  console.log(`\n${corridas - fallos}/${corridas} pruebas correctas.`);
  if (fallos > 0) {
    console.log('Hay fallos: revisa que kotlinc/swiftc y bubblewrap estén bien instalados.');
    process.exit(1);
  }
  console.log('El juez funciona en ambos lenguajes.');
  process.exit(0);
}

main();
