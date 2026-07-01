/**
 * Script de migración: Lab → Pagina JSON
 *
 * Lee todos los archivos de labs estáticos y genera un JSON con el formato
 * del modelo Pagina para ser insertado en la BD con seed-paginas.ts
 *
 * Uso: cd packages/web && npx tsx scripts/generate-paginas-json.ts
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Types (duplicated here to avoid alias issues) ──────────────────

interface LabRecurso {
  texto: string;
  url: string;
  externo: boolean;
}

interface LabPractica {
  titulo: string;
  enlace: string;
  descripcion: string;
}

interface Lab {
  id: string;
  numero: number | null;
  titulo: string;
  descripcion?: string;
  modalidad?: string;
  objetivos?: string[];
  instruccionesHtml?: string;
  preguntas?: string[];
  recursos?: LabRecurso[];
  entrega?: string;
  practica?: LabPractica;
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

let blockCounter = 0;
function makeId(): string {
  blockCounter++;
  // Deterministic IDs for reproducibility
  return `block-${String(blockCounter).padStart(4, '0')}`;
}

function labToPagina(lab: Lab, orden: number): PaginaExport {
  const bloques: ContentBlock[] = [];

  // 1. Encabezado (if there's modalidad or descripcion)
  if (lab.modalidad || lab.descripcion) {
    bloques.push({
      id: makeId(),
      tipo: 'encabezado',
      datos: {
        subtitulo: lab.descripcion ?? '',
        modalidad: lab.modalidad ?? '',
      },
    });
  }

  // 2. Practica
  if (lab.practica) {
    bloques.push({
      id: makeId(),
      tipo: 'practica',
      datos: {
        titulo: lab.practica.titulo,
        descripcion: lab.practica.descripcion,
        enlace: lab.practica.enlace,
      },
    });
  }

  // 3. Objetivos
  if (lab.objetivos && lab.objetivos.length > 0) {
    bloques.push({
      id: makeId(),
      tipo: 'objetivos',
      datos: { items: lab.objetivos },
    });
  }

  // 4. Instrucciones
  if (lab.instruccionesHtml) {
    bloques.push({
      id: makeId(),
      tipo: 'instrucciones',
      datos: { html: lab.instruccionesHtml },
    });
  }

  // 5. Preguntas
  if (lab.preguntas && lab.preguntas.length > 0) {
    bloques.push({
      id: makeId(),
      tipo: 'preguntas',
      datos: { items: lab.preguntas },
    });
  }

  // 6. Recursos
  if (lab.recursos && lab.recursos.length > 0) {
    bloques.push({
      id: makeId(),
      tipo: 'recursos',
      datos: {
        items: lab.recursos.map((r) => ({
          texto: r.texto,
          url: r.url,
          externo: r.externo,
        })),
      },
    });
  }

  // 7. Entrega
  if (lab.entrega) {
    bloques.push({
      id: makeId(),
      tipo: 'entrega',
      datos: { contenido: lab.entrega },
    });
  }

  return {
    titulo: lab.titulo,
    slug: lab.id,
    descripcion: lab.descripcion,
    icono: 'science',
    grupoId: null,
    bloques,
    publicado: true,
    orden,
  };
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const labsDir = resolve(__dirname, '../src/data/labs');
  const outputPath = resolve(__dirname, '../../api/scripts/paginas-data.json');

  // Find all lab*.ts files (exclude index.ts and lab-index.ts)
  const files = readdirSync(labsDir)
    .filter((f) => f.startsWith('lab') && f.endsWith('.ts') && f !== 'lab-index.ts')
    .sort();

  console.log(`Found ${files.length} lab files to migrate`);

  const paginas: PaginaExport[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = resolve(labsDir, file);

    // Read file content, strip the type import, and extract the object
    let content = readFileSync(filePath, 'utf-8');

    // Remove import statements
    content = content.replace(/^import\s+.*?;\s*$/gm, '');

    // Remove type annotations like `: Lab`
    content = content.replace(/:\s*Lab\s*=/, ' =');

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

    // Use filename (without .ts) as slug, not lab.id (some lab.id values are wrong)
    const slug = basename(file, '.ts');

    try {
      const fn = new Function(evalCode);
      const lab: Lab = fn();

      const pagina = labToPagina(lab, i);
      // Override slug with filename-based slug
      pagina.slug = slug;
      paginas.push(pagina);
      console.log(`  ✓ ${slug}: "${lab.titulo}" (${pagina.bloques.length} bloques)`);
    } catch (err) {
      console.error(`  ✗ Error processing ${file}:`, err);
    }
  }

  writeFileSync(outputPath, JSON.stringify(paginas, null, 2), 'utf-8');
  console.log(`\nGenerated ${paginas.length} pages → ${outputPath}`);
}

main().catch(console.error);
