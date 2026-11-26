/**
 * Reglas puras del Happiness Door: qué se acepta al crear y al editar una
 * entrada, y qué cuenta como día válido para el tablero.
 */
import { describe, it, expect } from 'vitest';
import {
  esDiaValido, validarEntrada, TEXTO_HAPPINESS_MAX, sesionesEvaluables, sesionSugerida,
} from '../src/services/happiness-door.js';
import { moduloHabilitado } from '../src/models/modulos-contenido.js';

describe('validarEntrada al crear', () => {
  it('acepta estado y texto, y recorta espacios', () => {
    expect(validarEntrada({ estado: 'positivo', texto: '  Buen día  ' }, true)).toEqual({ ok: true, estado: 'positivo', texto: 'Buen día' });
  });

  it('exige los dos campos', () => {
    expect(validarEntrada({ texto: 'hola' }, true).ok).toBe(false);
    expect(validarEntrada({ estado: 'neutral' }, true).ok).toBe(false);
    expect(validarEntrada(undefined, true).ok).toBe(false);
  });

  it('rechaza estados desconocidos y texto vacío o demasiado largo', () => {
    expect(validarEntrada({ estado: 'feliz', texto: 'x' }, true).ok).toBe(false);
    expect(validarEntrada({ estado: 'negativo', texto: '   ' }, true).ok).toBe(false);
    expect(validarEntrada({ estado: 'negativo', texto: 'x'.repeat(TEXTO_HAPPINESS_MAX + 1) }, true).ok).toBe(false);
    expect(validarEntrada({ estado: 'negativo', texto: 'x'.repeat(TEXTO_HAPPINESS_MAX) }, true).ok).toBe(true);
  });
});

describe('validarEntrada al editar', () => {
  it('basta con uno de los dos campos', () => {
    expect(validarEntrada({ estado: 'neutral' }, false)).toEqual({ ok: true, estado: 'neutral' });
    expect(validarEntrada({ texto: 'otro' }, false)).toEqual({ ok: true, texto: 'otro' });
  });

  it('sin ningún campo no hay nada que cambiar', () => {
    expect(validarEntrada({}, false).ok).toBe(false);
  });
});

describe('esDiaValido', () => {
  it('acepta fechas reales en AAAA-MM-DD', () => {
    expect(esDiaValido('2026-11-19')).toBe(true);
    expect(esDiaValido('2028-02-29')).toBe(true);
  });

  it('rechaza formatos y fechas imposibles', () => {
    expect(esDiaValido('2026-02-30')).toBe(false);
    expect(esDiaValido('19/11/2026')).toBe(false);
    expect(esDiaValido('2026-11-19T00:00')).toBe(false);
    expect(esDiaValido(undefined)).toBe(false);
  });
});

describe('módulo happiness', () => {
  it('nace apagado y se enciende por colección', () => {
    expect(moduloHabilitado(undefined, 'c1', 'happiness')).toBe(false);
    expect(moduloHabilitado({ c1: ['happiness'] }, 'c1', 'happiness')).toBe(true);
  });
});

describe('sesiones evaluables', () => {
  const horario = { lunes: { inicio: '17:30', fin: '19:30' }, martes: { inicio: '17:30', fin: '19:30' }, miercoles: { inicio: '17:30', fin: '19:30' } };
  const semanas = [{ id: 's1', numero: '1', fechaInicio: '2026-11-23', diasActivos: ['lunes', 'martes', 'miercoles', 'jueves'] }];
  const actividades = [
    { semanaId: 's1', dia: 'lunes', tipo: 'presentacion', titulo: 'Diagnóstico' },
    { semanaId: 's1', dia: 'lunes', tipo: 'info', titulo: 'Lectura', isPrevio: true },
    { semanaId: 's1', dia: 'martes', tipo: 'asueto', titulo: 'Puente' },
    { semanaId: 's1', dia: 'miercoles', tipo: 'info', titulo: 'UI/UX' },
    { semanaId: 's1', dia: 'jueves', tipo: 'info', titulo: 'Procesos' },
  ];
  const sesiones = sesionesEvaluables(horario, semanas, actividades, '2026-11-25');

  it('solo las que ya llegaron, sin asuetos ni previos, la más reciente primero', () => {
    expect(sesiones).toEqual([
      { dia: '2026-11-25', semana: '1', inicio: '17:30', temas: ['UI/UX'] },
      { dia: '2026-11-23', semana: '1', inicio: '17:30', temas: ['Diagnóstico'] },
    ]);
  });

  it('se sugiere la última que ya empezó: en la mañana, la de ayer', () => {
    expect(sesionSugerida(sesiones, { fecha: '2026-11-25', hora: '09:55' })?.dia).toBe('2026-11-23');
    expect(sesionSugerida(sesiones, { fecha: '2026-11-25', hora: '17:30' })?.dia).toBe('2026-11-25');
    expect(sesionSugerida(sesiones, { fecha: '2026-11-26', hora: '01:00' })?.dia).toBe('2026-11-25');
    expect(sesionSugerida([], { fecha: '2026-11-26', hora: '01:00' })).toBeNull();
  });

  it('el día viene en la entrada como AAAA-MM-DD, también solo al editar', () => {
    expect(validarEntrada({ dia: '2026-11-23' }, false)).toEqual({ ok: true, dia: '2026-11-23' });
    expect(validarEntrada({ estado: 'positivo', texto: 'x', dia: 'ayer' }, true).ok).toBe(false);
  });
});
