/**
 * Crea una Coleccion del CMS "Contenidos". El importador (`importar-markdown.ts`)
 * NO crea colecciones: solo agrega páginas a una que ya existe. Este script cubre
 * ese hueco sin tener que entrar al admin.
 *
 * Replica la validación de `createColeccion` (colecciones.controller.ts): slug con
 * formato válido y no reservado, sin duplicar slug ni clave, y NACE COMO BORRADOR
 * (`publicada: false`) — publicarla es una decisión humana desde el admin.
 *
 * Requiere el API corriendo (como el resto de los scripts).
 *
 * Uso:
 *   cd packages/api
 *   ./node_modules/.bin/tsx scripts/crear-coleccion.ts \
 *       --slug <slug> --nombre "<nombre>" [--clave <CLAVE>] [--descripcion "..."] \
 *       [--icono <material_icon>] [--dry-run]
 */
import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { Coleccion } from '../src/models/Coleccion.js';

function arg(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const dryRun = process.argv.includes('--dry-run');
const slug = arg('slug');
const nombre = arg('nombre');
const clave = arg('clave');
const descripcion = arg('descripcion');
const icono = arg('icono');

// Mismas reglas que el controlador del admin.
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUGS_RESERVADOS = new Set(['recursos', 'busqueda']);

if (!slug || !nombre) {
  console.error('Uso: crear-coleccion.ts --slug <slug> --nombre "<nombre>" [--clave <CLAVE>] [--descripcion "..."] [--icono <icono>] [--dry-run]');
  process.exit(1);
}
if (!SLUG_REGEX.test(slug) || SLUGS_RESERVADOS.has(slug)) {
  console.error(`Slug inválido o reservado: "${slug}". Solo minúsculas, números y guiones.`);
  process.exit(1);
}

async function existeDuplicado(campo: 'slug' | 'clave', valor: string): Promise<Coleccion | null> {
  const q = new Parse.Query<Coleccion>('Coleccion');
  q.equalTo(campo as any, valor as any);
  q.equalTo('exists' as any, true as any);
  return (await q.first({ useMasterKey: true })) ?? null;
}

async function main() {
  Parse.initialize(config.appId);
  (Parse as any).serverURL = config.serverURL;
  (Parse as any).masterKey = config.masterKey;

  const claveCanonica = clave ? clave.trim().toUpperCase() : '';

  const porSlug = await existeDuplicado('slug', slug!);
  if (porSlug) {
    console.error(`Ya existe una colección con slug "${slug}" (id ${porSlug.id}, "${porSlug.getNombre()}"). No se toca nada.`);
    process.exit(1);
  }
  if (claveCanonica) {
    const porClave = await existeDuplicado('clave', claveCanonica);
    if (porClave) {
      console.error(`Ya existe una colección con clave "${claveCanonica}" (id ${porClave.id}, "${porClave.getNombre()}"). No se toca nada.`);
      process.exit(1);
    }
  }

  console.log(`${dryRun ? 'CREARÍA' : 'CREANDO'} colección:`);
  console.log(`  nombre:      ${nombre}`);
  console.log(`  slug:        ${slug}`);
  console.log(`  clave:       ${claveCanonica || '(sin clave)'}`);
  console.log(`  descripción: ${descripcion ?? '(sin descripción)'}`);
  console.log(`  icono:       ${icono ?? 'menu_book (por defecto)'}`);
  console.log(`  publicada:   false  <- nace como borrador`);

  if (dryRun) {
    console.log('\nDry-run terminado. No se escribió nada.');
    process.exit(0);
  }

  const coleccion = new Coleccion().initDefaults();
  coleccion.setNombre(nombre!.trim());
  coleccion.setSlug(slug!);
  if (claveCanonica) coleccion.setClave(claveCanonica);
  if (descripcion?.trim()) coleccion.setDescripcion(descripcion.trim());
  if (icono?.trim()) coleccion.setIcono(icono.trim());
  coleccion.setPublicada(false);
  await coleccion.save(null, { useMasterKey: true });

  console.log(`\nListo. Colección creada con id ${coleccion.id}.`);
  console.log('El visor cachea los slugs 5 minutos; si no aparece de inmediato, espera o reinicia el API.');
  process.exit(0);
}

main().catch((error) => { console.error('[crear-coleccion] error:', error); process.exit(1); });
