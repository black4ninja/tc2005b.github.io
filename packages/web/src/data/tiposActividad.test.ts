/**
 * Red de seguridad del catálogo único de tipos de actividad.
 *
 * Este fichero existe porque el catálogo sustituyó a SIETE tablas paralelas, y
 * un refactor así solo vale si no cambia nada de lo que se ve. Las tablas de
 * abajo están **copiadas literalmente** del código anterior: si un accesor deja
 * de devolver lo mismo, es una regresión, no una mejora.
 *
 * La única salida que cambió a propósito está anotada en su test.
 */
import { describe, it, expect } from 'vitest';
import {
  TIPOS_ACTIVIDAD,
  TIPO_CHIP,
  ORDEN_TIPOS,
  TIPOS_FORMULARIO_CALENDARIO,
  TIPOS_PLAN_EVALUACION,
  nombreTipo,
  cortaTipo,
  pluralTipo,
  resumenTipo,
  formularioTipo,
  iconoTipo,
  colorTipo,
  fondoTipo,
} from './tiposActividad';
import type { ActividadTipo } from '@/types/calendario';

/** Los doce tipos declarados en `ActividadTipo`. */
const TODOS: ActividadTipo[] = [
  'lab', 'lectura', 'ejercicio', 'proyecto', 'evaluacion', 'break',
  'asueto', 'trabajo', 'discusion', 'info', 'actividad', 'presentacion',
];

describe('cobertura del catálogo', () => {
  it('cubre los doce tipos de ActividadTipo, sin sobras', () => {
    expect(new Set(ORDEN_TIPOS)).toEqual(new Set(TODOS));
    expect(ORDEN_TIPOS).toHaveLength(TODOS.length);
  });

  it('el orden canónico es el que tenía ETIQUETA_TIPO, del que depende `tiposEnCalendario`', () => {
    expect(ORDEN_TIPOS).toEqual([
      'lab', 'lectura', 'ejercicio', 'proyecto', 'evaluacion', 'trabajo',
      'discusion', 'info', 'actividad', 'presentacion', 'break', 'asueto',
    ]);
  });

  it('todo tipo tiene nombre, plural e icono', () => {
    for (const t of ORDEN_TIPOS) {
      expect(TIPOS_ACTIVIDAD[t].nombre, t).toBeTruthy();
      expect(TIPOS_ACTIVIDAD[t].plural, t).toBeTruthy();
      expect(TIPOS_ACTIVIDAD[t].icono, t).toBeTruthy();
    }
  });
});

describe('nombreTipo — era ETIQUETA_TIPO (materialesDelCalendario)', () => {
  const ANTES: Record<string, string> = {
    lab: 'Laboratorio', lectura: 'Lectura', ejercicio: 'Ejercicio', proyecto: 'Proyecto',
    evaluacion: 'Evaluación', trabajo: 'Trabajo', discusion: 'Discusión', info: 'Información',
    actividad: 'Actividad', presentacion: 'Presentación', break: 'Receso', asueto: 'Asueto',
  };
  it('devuelve exactamente lo de antes', () => {
    for (const [tipo, esperado] of Object.entries(ANTES)) {
      expect(nombreTipo(tipo), tipo).toBe(esperado);
    }
  });
});

describe('cortaTipo — era TIPO_CONFIG.label (tres pantallas del panel)', () => {
  const ANTES: Record<string, string> = {
    lab: 'Lab', lectura: 'Lectura', ejercicio: 'Ejercicio', proyecto: 'Proyecto',
    evaluacion: 'Evaluación', break: 'Receso', asueto: 'Asueto', trabajo: 'Trabajo',
    discusion: 'Discusión', info: 'Info', actividad: 'Actividad', presentacion: 'Presentación',
  };
  it('devuelve exactamente lo de antes', () => {
    for (const [tipo, esperado] of Object.entries(ANTES)) {
      expect(cortaTipo(tipo), tipo).toBe(esperado);
    }
  });

  it('TIPO_CHIP conserva la forma { label, color, bg } que consumen las pantallas', () => {
    for (const tipo of ORDEN_TIPOS) {
      expect(TIPO_CHIP[tipo]).toEqual({
        label: ANTES[tipo],
        color: `var(--color-${tipo})`,
        bg: `var(--color-${tipo}-light)`,
      });
    }
  });
});

describe('pluralTipo — era ETIQUETA_PILDORA (barra de filtros)', () => {
  const ANTES: Record<string, string> = {
    lab: 'Labs', lectura: 'Lecturas', ejercicio: 'Ejercicios', proyecto: 'Proyecto',
    evaluacion: 'Evaluación', trabajo: 'Trabajo', discusion: 'Discusiones',
    info: 'Información', actividad: 'Actividades', presentacion: 'Presentaciones',
    break: 'Recesos', asueto: 'Asuetos',
  };
  it('devuelve exactamente lo de antes', () => {
    for (const [tipo, esperado] of Object.entries(ANTES)) {
      expect(pluralTipo(tipo), tipo).toBe(esperado);
    }
  });
});

describe('resumenTipo — era SUMMARY_LABELS (resumen de la semana)', () => {
  const ANTES: Record<string, string> = {
    lab: 'Labs', lectura: 'Lecturas', ejercicio: 'Ejercicios', proyecto: 'Proyecto',
    evaluacion: 'Eval', trabajo: 'Trabajo', discusion: 'Discusión', info: 'Info',
    presentacion: 'Presentaciones',
  };

  it('devuelve exactamente lo de antes para los nueve que contaban', () => {
    for (const [tipo, esperado] of Object.entries(ANTES)) {
      expect(resumenTipo(tipo), tipo).toBe(esperado);
    }
  });

  it('`actividad` SÍ cuenta ahora — era el olvido que quedaba', () => {
    // No salía en `SUMMARY_LABELS`, así que el `.filter()` la descartaba y una
    // semana llena de actividades del plan enseñaba el resumen vacío. Es el
    // único rótulo que este catálogo añade respecto al código anterior.
    expect(resumenTipo('actividad')).toBe('Actividades');
  });

  it('los días sin clase siguen fuera del resumen', () => {
    // El resumen mide cuánto trabajo trae la semana; un receso o un asueto no
    // aportan nada a esa cuenta.
    for (const tipo of ['break', 'asueto']) {
      expect(resumenTipo(tipo), tipo).toBeNull();
    }
  });
});

describe('formulario del calendario — era TIPO_OPTIONS', () => {
  const ANTES: [ActividadTipo, string][] = [
    ['lab', 'Laboratorio'],
    ['lectura', 'Lectura'],
    ['ejercicio', 'Ejercicio'],
    ['proyecto', 'Proyecto'],
    ['evaluacion', 'Evaluación'],
    ['trabajo', 'Trabajo en clase'],
    ['discusion', 'Discusión / Resolución de dudas'],
    ['info', 'Información / Caso de estudio'],
    ['presentacion', 'Presentación'],
    ['break', 'Descanso'],
    ['asueto', 'Asueto'],
  ];

  it('ofrece los mismos once tipos, con los mismos textos', () => {
    expect(TIPOS_FORMULARIO_CALENDARIO.map((t) => [t, formularioTipo(t)])).toEqual(ANTES);
  });

  it('sigue sin ofrecer `actividad`: eso llega desde el plan de evaluación', () => {
    expect(TIPOS_FORMULARIO_CALENDARIO).not.toContain('actividad');
  });
});

describe('plan de evaluación — era TIPOS_AGREGAR', () => {
  it('ofrece los mismos nueve tipos, en el mismo orden curado', () => {
    expect(TIPOS_PLAN_EVALUACION).toEqual([
      'actividad', 'lab', 'lectura', 'ejercicio', 'proyecto',
      'evaluacion', 'trabajo', 'discusion', 'info',
    ]);
  });
});

describe('iconoTipo — era ICON_MAP (ActivityItem)', () => {
  const ANTES: Record<string, string> = {
    lab: 'assignment', lectura: 'menu_book', ejercicio: 'edit', proyecto: 'stars',
    evaluacion: 'check_circle', break: 'free_breakfast', asueto: 'event_busy',
    trabajo: 'work', discusion: 'forum', info: 'info_outline',
    actividad: 'assignment', presentacion: 'slideshow',
  };
  it('devuelve exactamente lo de antes', () => {
    for (const [tipo, esperado] of Object.entries(ANTES)) {
      expect(iconoTipo(tipo), tipo).toBe(esperado);
    }
  });
});

describe('exportación a Excel — era TIPO_LABEL (mallaExport)', () => {
  const ANTES: Record<string, string> = {
    lab: 'Lab', lectura: 'Lectura', ejercicio: 'Ejercicio', proyecto: 'Proyecto',
    evaluacion: 'Evaluación', break: 'Receso', asueto: 'Asueto', trabajo: 'Trabajo',
    discusion: 'Discusión', info: 'Info', actividad: 'Actividad',
  };

  it('devuelve exactamente lo de antes para los once que tenía', () => {
    for (const [tipo, esperado] of Object.entries(ANTES)) {
      expect(cortaTipo(tipo), tipo).toBe(esperado);
    }
  });

  it('`presentacion` deja de salir en crudo: es el ÚNICO cambio de salida', () => {
    // A ese mapa le faltaba el tipo y el `?? act.tipo` escribía «presentacion»
    // en la celda del Excel.
    expect(cortaTipo('presentacion')).toBe('Presentación');
  });
});

describe('tipos que aún no están en el catálogo', () => {
  it('se ven con su clave cruda en vez de desaparecer', () => {
    expect(nombreTipo('taller')).toBe('taller');
    expect(cortaTipo('taller')).toBe('taller');
    expect(pluralTipo('taller')).toBe('taller');
    expect(formularioTipo('taller')).toBe('taller');
  });

  it('no cuentan en el resumen y llevan icono de reserva', () => {
    expect(resumenTipo('taller')).toBeNull();
    expect(iconoTipo('taller')).toBe('info_outline');
  });

  it('los colores se derivan del nombre del tipo, sin tabla', () => {
    expect(colorTipo('taller')).toBe('var(--color-taller)');
    expect(fondoTipo('taller')).toBe('var(--color-taller-light)');
  });
});
