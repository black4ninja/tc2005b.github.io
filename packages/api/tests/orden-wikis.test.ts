import { describe, it, expect } from 'vitest';
import { ordenarWikisPorGrupo } from '../src/utils/orden-wikis.js';

const w = (id: string) => ({ id, slug: id.toLowerCase() });

describe('ordenarWikisPorGrupo', () => {
  it('pone primero la wiki del grupo abierto aunque llegara después', () => {
    const r = ordenarWikisPorGrupo([w('TC2007B'), w('TC2005B')], ['TC2005B']);
    expect(r.map((x) => x.id)).toEqual(['TC2005B', 'TC2007B']);
  });

  it('respeta el orden en que el grupo tiene asignadas sus wikis', () => {
    const r = ordenarWikisPorGrupo([w('A'), w('B'), w('C')], ['C', 'A']);
    expect(r.map((x) => x.id)).toEqual(['C', 'A', 'B']);
  });

  it('sin wikis del grupo deja el orden como venía', () => {
    const r = ordenarWikisPorGrupo([w('B'), w('A')], ['Z']);
    expect(r.map((x) => x.id)).toEqual(['B', 'A']);
  });

  it('ignora las del grupo que el alumno no puede ver', () => {
    const r = ordenarWikisPorGrupo([w('A')], ['B', 'A']);
    expect(r.map((x) => x.id)).toEqual(['A']);
  });
});
