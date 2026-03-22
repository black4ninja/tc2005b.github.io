/**
 * Script de migración: Avance → Pagina JSON
 *
 * Lee todos los archivos de avances estáticos y genera un JSON con el formato
 * del modelo Pagina para ser insertado en la BD con seed-paginas.ts
 *
 * Uso: cd packages/web && npx tsx scripts/generate-avances-json.ts
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Types (duplicated here to avoid alias issues) ──────────────────

interface AvanceInstruccion {
  titulo?: string;
  contenido?: string;
  items?: string[];
}

interface AvanceEntrega {
  contenido: string;
  tag: string | null;
  video: boolean;
  coevaluacion: boolean;
  coevaluacionUrl?: string;
}

interface Avance {
  id: string;
  numero: number;
  titulo: string;
  descripcion: string;
  modalidad: string;
  fechaEntrega: string;
  objetivos: string[];
  instrucciones: AvanceInstruccion[];
  entrega: AvanceEntrega;
}

interface ContentBlock {
  id: string;
  tipo: string;
  datos: Record<string, unknown>;
}

interface PaginaExport {
  titulo: string;
  slug: string;
  descripcion?: string;
  icono: string;
  grupoId: null;
  bloques: ContentBlock[];
  publicado: boolean;
  orden: number;
}

// ── Helpers ─────────────────────────────────────────────────────────

let blockCounter = 5000; // Offset to avoid collision with lab IDs
function makeId(): string {
  blockCounter++;
  return `block-${String(blockCounter).padStart(4, '0')}`;
}

function instruccionesToHtml(instrucciones: AvanceInstruccion[]): string {
  return instrucciones
    .map((inst) => {
      let html = '';
      if (inst.titulo) {
        html += `<h3>${inst.titulo}</h3>`;
      }
      if (inst.contenido) {
        html += `<p>${inst.contenido}</p>`;
      }
      if (inst.items && inst.items.length > 0) {
        html += '<ul>';
        for (const item of inst.items) {
          html += `<li>${item}</li>`;
        }
        html += '</ul>';
      }
      return html;
    })
    .join('\n');
}

function avanceToPagina(avance: Avance, orden: number): PaginaExport {
  const bloques: ContentBlock[] = [];

  // 1. Encabezado
  bloques.push({
    id: makeId(),
    tipo: 'encabezado',
    datos: {
      subtitulo: avance.descripcion ?? '',
      modalidad: avance.modalidad ?? '',
      fechaEntrega: avance.fechaEntrega ?? '',
    },
  });

  // 2. Objetivos
  if (avance.objetivos && avance.objetivos.length > 0) {
    bloques.push({
      id: makeId(),
      tipo: 'objetivos',
      datos: { items: avance.objetivos },
    });
  }

  // 3. Instrucciones (flatten structured array to HTML)
  if (avance.instrucciones && avance.instrucciones.length > 0) {
    bloques.push({
      id: makeId(),
      tipo: 'instrucciones',
      datos: { html: instruccionesToHtml(avance.instrucciones) },
    });
  }

  // 4. Entrega (with extended fields)
  bloques.push({
    id: makeId(),
    tipo: 'entrega',
    datos: {
      contenido: avance.entrega.contenido,
      tag: avance.entrega.tag ?? '',
      video: avance.entrega.video,
      coevaluacion: avance.entrega.coevaluacion,
      coevaluacionUrl: avance.entrega.coevaluacionUrl ?? '',
    },
  });

  return {
    titulo: `Avance ${avance.numero}: ${avance.titulo}`,
    slug: avance.id,
    descripcion: avance.descripcion,
    icono: 'flag',
    grupoId: null,
    bloques,
    publicado: true,
    orden,
  };
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const avancesDir = resolve(__dirname, '../src/data/avances');
  const outputPath = resolve(__dirname, '../../api/scripts/avances-data.json');

  // Find all av*.ts files (exclude index.ts)
  const files = readdirSync(avancesDir)
    .filter((f) => f.startsWith('av') && f.endsWith('.ts') && f !== 'index.ts')
    .sort();

  console.log(`Found ${files.length} avance files to migrate`);

  const paginas: PaginaExport[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = resolve(avancesDir, file);

    let content = readFileSync(filePath, 'utf-8');

    // Remove import statements
    content = content.replace(/^import\s+.*?;\s*$/gm, '');

    // Remove type annotations like `: Avance`
    content = content.replace(/:\s*Avance\s*=/, ' =');

    // Remove export default line
    content = content.replace(/^export\s+default\s+\w+\s*;\s*$/gm, '');

    // Find the variable name
    const varMatch = content.match(/const\s+(\w+)\s*=/);
    if (!varMatch) {
      console.warn(`  Skipping ${file}: could not find variable declaration`);
      continue;
    }

    const varName = varMatch[1];
    const evalCode = content + `\nreturn ${varName};`;

    const slug = basename(file, '.ts');

    try {
      const fn = new Function(evalCode);
      const avance: Avance = fn();

      const pagina = avanceToPagina(avance, i);
      // Override slug with filename-based slug
      pagina.slug = slug;
      paginas.push(pagina);
      console.log(`  ✓ ${slug}: "${avance.titulo}" (${pagina.bloques.length} bloques)`);
    } catch (err) {
      console.error(`  ✗ Error processing ${file}:`, err);
    }
  }

  writeFileSync(outputPath, JSON.stringify(paginas, null, 2), 'utf-8');
  console.log(`\nGenerated ${paginas.length} pages → ${outputPath}`);
}

main().catch(console.error);
