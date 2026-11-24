import { describe, it, expect } from 'vitest';
import {
  acomodarDia, aclarar, coloresDe, grupoVisible, lunesDe, rangoHoras, sumarDias, textoSobre, traslapes,
  type EventoAgenda,
} from './miAgenda';

const ev = (id: string, fecha: string, inicio: string, fin: string, grupoId = 'g'): EventoAgenda =>
  ({ id, tipo: 'sesion', grupoId, fecha, inicio, fin, titulo: '' });

describe('fechas', () => {
  it('lunesDe devuelve el lunes de la semana, también desde un domingo', () => {
    expect(lunesDe('2026-11-25')).toBe('2026-11-23');
    expect(lunesDe('2026-11-29')).toBe('2026-11-23');
    expect(lunesDe('2026-11-23')).toBe('2026-11-23');
  });
  it('sumarDias cruza meses y años', () => {
    expect(sumarDias('2026-12-28', 7)).toBe('2027-01-04');
  });
});

describe('traslapes', () => {
  it('encuentra los pares que se pisan, aunque sean de grupos distintos', () => {
    const t = traslapes([
      ev('a', '2026-11-23', '17:30', '19:30', 'g1'),
      ev('b', '2026-11-23', '19:00', '20:00', 'g2'),
      ev('c', '2026-11-23', '19:30', '21:00', 'g3'),
      ev('d', '2026-11-24', '17:30', '19:30', 'g2'),
    ]);
    expect(t.map((p) => `${p.a.id}-${p.b.id}`)).toEqual(['a-b', 'b-c']);
  });
  it('uno que empieza justo cuando el otro acaba no es traslape', () => {
    expect(traslapes([ev('a', '2026-11-23', '09:00', '11:00'), ev('b', '2026-11-23', '11:00', '13:00')])).toEqual([]);
  });
  it('detecta el que está contenido en otro más largo', () => {
    const t = traslapes([ev('largo', '2026-11-23', '09:00', '13:00'), ev('corto', '2026-11-23', '10:00', '10:30'), ev('otro', '2026-11-23', '12:00', '12:30')]);
    expect(t.map((p) => `${p.a.id}-${p.b.id}`)).toEqual(['largo-corto', 'largo-otro']);
  });
});

describe('acomodarDia', () => {
  it('pone lado a lado los que se pisan y deja solo al que no', () => {
    const r = acomodarDia([
      ev('a', 'd', '09:00', '11:00'),
      ev('b', 'd', '10:00', '12:00'),
      ev('c', 'd', '13:00', '14:00'),
    ]);
    const por = Object.fromEntries(r.map((x) => [x.evento.id, `${x.columna}/${x.columnas}`]));
    expect(por).toEqual({ a: '0/2', b: '1/2', c: '0/1' });
  });
  it('reutiliza la columna que se libera dentro del mismo racimo', () => {
    const r = acomodarDia([ev('a', 'd', '09:00', '13:00'), ev('b', 'd', '09:30', '10:00'), ev('c', 'd', '10:30', '11:00')]);
    const por = Object.fromEntries(r.map((x) => [x.evento.id, `${x.columna}/${x.columnas}`]));
    expect(por).toEqual({ a: '0/2', b: '1/2', c: '1/2' });
  });
});

describe('colores y visibilidad', () => {
  it('aclarar mezcla con blanco', () => {
    expect(aclarar('#000000', 0.5)).toBe('#808080');
    expect(aclarar('#ffffff')).toBe('#ffffff');
  });
  it('textoSobre elige blanco en fondo oscuro y tinta en fondo claro', () => {
    expect(textoSobre('#2563eb')).toBe('#ffffff');
    expect(textoSobre('#fde68a')).toBe('#0b1220');
  });
  it('coloresDe usa la preferencia o la paleta, y las entrevistas salen más claras', () => {
    expect(coloresDe(0, undefined).sesiones).toBe('#2563eb');
    expect(coloresDe(0, { sesiones: '#000000' }).entrevistas).toBe(aclarar('#000000'));
    expect(coloresDe(0, { entrevistas: '#123456' }).entrevistas).toBe('#123456');
  });
  it('sin preferencia se ven solo los grupos propios', () => {
    const g = { id: 'x', name: 'X', esMio: false, conHorario: true };
    expect(grupoVisible(g, undefined)).toBe(false);
    expect(grupoVisible(g, { oculto: false })).toBe(true);
    expect(grupoVisible({ ...g, esMio: true }, { oculto: true })).toBe(false);
  });
  it('rangoHoras se amplía si algo se sale de 7 a 21', () => {
    expect(rangoHoras([ev('a', 'd', '06:30', '08:00'), ev('b', 'd', '20:00', '22:15')])).toEqual({ desde: 6, hasta: 23 });
    expect(rangoHoras([])).toEqual({ desde: 7, hasta: 21 });
  });
});
