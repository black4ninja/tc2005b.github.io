import { describe, it, expect } from 'vitest';
import { actividadDesdeApi } from './actividadDesdeApi';

describe('actividadDesdeApi', () => {
  it('conserva la hora, los responsables y el adjunto', () => {
    const act = actividadDesdeApi({
      id: 'a1',
      tipo: 'presentacion',
      titulo: 'Diagnóstico',
      horaInicio: '17:30',
      horaFin: '18:00',
      responsables: ['p1', 'p2'],
      archivoNombre: 'slides.pdf',
      archivoMime: 'application/pdf',
      archivoBytes: 1234,
    });
    expect(act.horaInicio).toBe('17:30');
    expect(act.horaFin).toBe('18:00');
    expect(act.responsables).toEqual(['p1', 'p2']);
    expect(act.archivoNombre).toBe('slides.pdf');
    expect(act.archivoBytes).toBe(1234);
  });

  it('sin hora ni responsables los deja vacíos (= todos, horario de la clase)', () => {
    const act = actividadDesdeApi({ id: 'a2', tipo: 'lab' });
    expect(act.horaInicio).toBeUndefined();
    expect(act.responsables).toBeUndefined();
  });
});
