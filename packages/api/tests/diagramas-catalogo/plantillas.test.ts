import { describe, expect, it } from 'vitest';
import {
  KEYS,
  MOTORES,
  PLANTILLAS,
  TIPOS,
  agrupado,
  motorPorOmision,
  motoresDe,
  plantilla,
} from '@tc2005b/diagramas-catalogo';
import { instalarDom } from '../../src/services/juez-diagramas/entorno-dom.js';

/**
 * El catálogo promete que cada tipo arranca con un esqueleto válido. Sin esta
 * prueba la promesa es de palabra: una plantilla con un typo no falla en el
 * build, falla en la cara del alumno que abre el editor y ve un error que no
 * escribió él.
 *
 * Las de Mermaid se pasan por el PARSER REAL, el mismo que usa el juez. Las de
 * PlantUML solo se comprueban estructuralmente: su motor está compilado con
 * TeaVM y no corre en Node (ver la cabecera de `normalizar-plantuml.ts`), así
 * que aquí no hay contra qué validarlas.
 */

const conMermaid = KEYS.filter((k) => typeof PLANTILLAS[k]?.mermaid === 'string');
const conPlantuml = KEYS.filter((k) => typeof PLANTILLAS[k]?.plantuml === 'string');

describe('catálogo de tipos de diagrama', () => {
  it('no repite claves', () => {
    expect(new Set(KEYS).size).toBe(KEYS.length);
  });

  it('conserva las ocho claves que ya están escritas en la BD', () => {
    // Renombrar cualquiera de estas obliga a migrar `EjercicioDiagrama` y
    // `DiagramaTaller`. La prueba existe para que el cambio sea deliberado.
    for (const k of [
      'clases', 'secuencia', 'estados', 'er',
      'flujo', 'casos-de-uso', 'componentes', 'paquetes',
    ]) {
      expect(KEYS).toContain(k);
    }
  });

  it('da a cada tipo al menos un motor que lo dibuje', () => {
    const huerfanos = KEYS.filter((k) => motoresDe(k).length === 0);
    expect(huerfanos).toEqual([]);
  });

  it('solo declara para el juez motores en los que además hay plantilla', () => {
    // Un tipo que el juez acepta en un motor sin plantilla deja al alumno con el
    // editor en blanco justo donde su envío SÍ se corregiría.
    for (const t of TIPOS) {
      for (const motor of t.motoresJuez) {
        expect(motoresDe(t.key), `${t.key} en ${motor}`).toContain(motor);
      }
    }
  });

  it('elige como motor por omisión uno que el juez acepte, si lo hay', () => {
    for (const t of TIPOS) {
      if (t.motoresJuez.length === 0) continue;
      expect(t.motoresJuez, t.key).toContain(motorPorOmision(t.key));
    }
  });

  it('coloca todos los tipos en algún grupo navegable', () => {
    const agrupados = agrupado().flatMap((g) => g.tipos.map((t) => t.key));
    expect([...agrupados].sort()).toEqual([...KEYS].sort());
  });

  it('describe cada tipo con una línea', () => {
    for (const t of TIPOS) {
      expect(t.label.trim(), t.key).not.toBe('');
      expect(t.descripcion.trim(), t.key).not.toBe('');
      expect(t.descripcion, t.key).not.toContain('\n');
    }
  });
});

describe('plantillas de PlantUML', () => {
  it('cubre los tipos que solo existen en PlantUML', () => {
    expect(conPlantuml.length).toBeGreaterThan(0);
  });

  it.each(conPlantuml)('«%s» abre y cierra el mismo bloque', (key) => {
    const codigo = plantilla(key, 'plantuml').trim();
    const apertura = codigo.match(/^@start([a-z]+)/i);
    expect(apertura, `${key}: no empieza por @start…`).not.toBeNull();
    expect(codigo).toMatch(new RegExp(`@end${apertura![1]}\\s*$`, 'i'));
  });
});

describe('plantillas de Mermaid', () => {
  /**
   * Se inicializa una sola vez para toda la suite: `initialize` es global y
   * rehacerlo por caso no aporta nada.
   */
  async function motor() {
    instalarDom();
    const mermaid = (await import('mermaid')).default;
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
    return mermaid;
  }

  it('cubre la mayoría del catálogo', () => {
    expect(conMermaid.length).toBeGreaterThan(20);
  });

  it.each(conMermaid)('«%s» parsea con el motor real', async (key) => {
    const mermaid = await motor();
    await expect(mermaid.parse(plantilla(key, 'mermaid'))).resolves.toBeTruthy();
  });
});

describe('motores', () => {
  it('no ofrece un motor fuera de los dos conocidos', () => {
    const conocidos = MOTORES.map((m) => m.key);
    for (const key of KEYS) {
      for (const motor of Object.keys(PLANTILLAS[key] ?? {})) {
        expect(conocidos, `${key}`).toContain(motor);
      }
    }
  });
});
