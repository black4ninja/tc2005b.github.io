import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';

export class CompetenciaAlumno extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('CompetenciaAlumno', attributes);
  }

  // Pointers
  getCompetencia(): Parse.Object | undefined {
    return this.get('competencia');
  }
  setCompetencia(competencia: Parse.Object): void {
    this.set('competencia', competencia);
  }

  getGrupo(): Parse.Object | undefined {
    return this.get('grupo');
  }
  setGrupo(grupo: Parse.Object): void {
    this.set('grupo', grupo);
  }

  getAlumno(): Parse.Object | undefined {
    return this.get('alumno');
  }
  setAlumno(alumno: Parse.Object): void {
    this.set('alumno', alumno);
  }

  /* ── Los valores son NÚMEROS en la base ──
   *
   * La columna quedó tipada como `Number` (0/15/70/85/100, y ahora −30 para la
   * sanción). Guardar un string ahí lo rechaza Parse entero, con un
   * «schema mismatch» que subía como un 500 genérico.
   *
   * "Sin evaluar" se representa QUITANDO el campo, no con `''`: una cadena vacía
   * en una columna numérica es el mismo error.
   */
  getValorPeriodo1(): number | undefined {
    return this.get('valorPeriodo1');
  }
  setValorPeriodo1(val: number | undefined): void {
    if (val === undefined) this.unset('valorPeriodo1');
    else this.set('valorPeriodo1', val);
  }

  getValorPeriodo2(): number | undefined {
    return this.get('valorPeriodo2');
  }
  setValorPeriodo2(val: number | undefined): void {
    if (val === undefined) this.unset('valorPeriodo2');
    else this.set('valorPeriodo2', val);
  }

  getRetroPeriodo1(): string {
    return this.get('retroPeriodo1') ?? '';
  }
  setRetroPeriodo1(val: string): void {
    this.set('retroPeriodo1', val);
  }

  getRetroPeriodo2(): string {
    return this.get('retroPeriodo2') ?? '';
  }
  setRetroPeriodo2(val: string): void {
    this.set('retroPeriodo2', val);
  }

  getEvidencias(): string[] {
    return this.get('evidencias') ?? [];
  }
  setEvidencias(evidencias: string[]): void {
    this.set('evidencias', evidencias);
  }

  toSafeJSON(): Record<string, unknown> {
    const comp = this.getCompetencia();
    return {
      id: this.id,
      competencia: comp?.get('competencia') ?? '',
      nivel: comp?.get('nivel') ?? '',
      descripcionNivel: comp?.get('descripcionNivel') ?? '',
      orden: comp?.get('orden') ?? 0,
      // Campos descriptivos de niveles desde el pointer
      guiaEvidencias: comp?.get('guiaEvidencias') ?? '',
      incipienteB: comp?.get('incipienteB') ?? '',
      incipienteA: comp?.get('incipienteA') ?? '',
      basico: comp?.get('basico') ?? '',
      solido: comp?.get('solido') ?? '',
      destacado: comp?.get('destacado') ?? '',
      fechaIdealEvaluacion: comp?.get('fechaIdealEvaluacion') ?? '',
      penalizacion: comp?.get('penalizacion') ?? '',
      admitePenalizacion: comp?.get('admitePenalizacion') === true,
      // Lo necesitan las tres pantallas que calculan nota en el cliente (malla,
      // panel del alumno y export): sin esto ponderarían con todo a cero.
      puntos: comp?.get('puntos') ?? 0,
      esCalculada: comp?.get('esCalculada') ?? false,
      dependencias: (comp?.get('dependencias') ?? []).map((d: Parse.Object) => ({
        id: d.id,
        competencia: d.get('competencia') ?? '',
      })),
      // Campos del alumno
      // `?? ''` para que el contrato hacia el cliente no cambie: «sin evaluar»
      // se sigue viendo como cadena vacía, aunque en la base ya no exista el campo.
      valorPeriodo1: this.getValorPeriodo1() ?? '',
      valorPeriodo2: this.getValorPeriodo2() ?? '',
      retroPeriodo1: this.getRetroPeriodo1(),
      retroPeriodo2: this.getRetroPeriodo2(),
      evidencias: this.getEvidencias(),
      grupoId: this.getGrupo()?.id,
      alumnoId: this.getAlumno()?.id,
      competenciaId: comp?.id,
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

/**
 * Ordena la malla como la tabla de competencias de la materia.
 *
 * `CompetenciaAlumno` tiene su propio campo `orden`, pero NADIE lo escribe:
 * `crearCompetenciasAlumno` no lo pone, así que ordenar por él dejaba las filas
 * en el orden en que Parse quisiera devolverlas —el de creación, en la
 * práctica— y la malla salía barajada respecto del catálogo que el profesor ve
 * en Contenidos. El orden bueno vive en `Competencia.orden`, que es el que se
 * edita ahí y el que ya usa `competenciasDeGrupo`.
 *
 * Hace falta en memoria porque Parse no sabe ordenar por el campo de un
 * puntero; por eso el `include('competencia')` no es opcional en quien llame.
 *
 * Empata por nombre para que el resultado sea estable: sin desempate, dos
 * competencias con el mismo `orden` —o las dos sin él— bailan entre recargas.
 */
export function ordenarComoElCatalogo<T extends CompetenciaAlumno>(filas: T[]): T[] {
  const clave = (f: T) => {
    const comp = f.getCompetencia();
    const orden = comp?.get('orden');
    return {
      // Sin `orden` van al final, no al principio: un 0 implícito las colaría
      // por delante de la primera de verdad.
      orden: typeof orden === 'number' ? orden : Number.POSITIVE_INFINITY,
      nombre: (comp?.get('competencia') ?? '') as string,
    };
  };
  return [...filas].sort((a, b) => {
    const x = clave(a);
    const y = clave(b);
    if (x.orden !== y.orden) return x.orden - y.orden;
    return x.nombre.localeCompare(y.nombre, 'es');
  });
}

Parse.Object.registerSubclass('CompetenciaAlumno', CompetenciaAlumno);
