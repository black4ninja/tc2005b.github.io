/**
 * Catálogo de CAMPOS del perfil que el alumno rellena al entrar a un grupo, y
 * qué grupos pueden apagar cuáles.
 *
 * El perfil es lo que abre el panel del alumno: mientras `GrupoAlumno.perfilCompleto`
 * sea false, el menú le deja gris Malla, Competencias, Documentación, Ejercicios y
 * Agendar Entrevistas. Esa bandera se pone a true cuando TODOS los campos exigidos
 * pasan su validación, así que apagar un campo aquí lo saca de la regla: deja de
 * pedirse y deja de bloquear.
 *
 * Igual que `modulosDeshabilitados`, el grupo guarda solo lo que DIFIERE del
 * default (`Grupo.camposPerfilDeshabilitados`): sin el campo = todo exigido, que
 * es el comportamiento de siempre y no hay nada que migrar.
 *
 * `CAMPOS_DESACTIVABLES` es corto a propósito. Experiencia, expectativas y
 * compromiso son el compromiso mínimo que se pide en todos los grupos; que no se
 * puedan apagar es una decisión, no un descuido.
 */
export const CAMPOS_PERFIL = [
  'experiencia',
  'expectativas',
  'compromiso',
  'repositorioIndividual',
  'situacionesEspeciales',
] as const;

export type CampoPerfil = (typeof CAMPOS_PERFIL)[number];

/** Campos que un grupo puede quitar de su perfil. */
export const CAMPOS_DESACTIVABLES: ReadonlySet<CampoPerfil> = new Set<CampoPerfil>([
  // No todos los cursos piden repositorio individual.
  'repositorioIndividual',
]);

export function esCampoPerfilValido(v: unknown): v is CampoPerfil {
  return typeof v === 'string' && (CAMPOS_PERFIL as readonly string[]).includes(v);
}

export function esCampoDesactivable(v: unknown): v is CampoPerfil {
  return esCampoPerfilValido(v) && CAMPOS_DESACTIVABLES.has(v);
}

/** ¿Este grupo exige este campo? Lista vacía o ausente = los exige todos. */
export function campoPerfilHabilitado(campo: CampoPerfil, deshabilitados: readonly string[] | undefined): boolean {
  if (!deshabilitados || deshabilitados.length === 0) return true;
  // Un campo NO desactivable se exige aunque alguien lo haya colado en la lista:
  // así un dato viejo o manipulado no puede saltarse el mínimo común.
  if (!CAMPOS_DESACTIVABLES.has(campo)) return true;
  return !deshabilitados.includes(campo);
}

export interface DatosPerfil {
  experiencia?: unknown;
  expectativas?: unknown;
  compromiso?: unknown;
  repositorioIndividual?: unknown;
  situacionesEspeciales?: unknown;
}

const MINIMOS: Record<string, number> = {
  experiencia: 10,
  expectativas: 10,
  compromiso: 10,
  situacionesEspeciales: 5,
};

/**
 * Valida el perfil que manda el alumno, saltándose los campos que su grupo tiene
 * apagados. Devuelve `{campo: mensaje}`; vacío = el perfil se puede dar por
 * completo.
 *
 * Es pura y la comparte el servidor con sus pruebas; el formulario del alumno
 * espeja estas mismas reglas para avisar antes de enviar.
 */
export function validarPerfil(
  datos: DatosPerfil,
  deshabilitados: readonly string[] | undefined,
): Record<string, string> {
  const errores: Record<string, string> = {};

  for (const campo of ['experiencia', 'expectativas', 'compromiso', 'situacionesEspeciales'] as const) {
    if (!campoPerfilHabilitado(campo, deshabilitados)) continue;
    const v = datos[campo];
    const min = MINIMOS[campo];
    if (typeof v !== 'string' || v.trim().length < min) {
      errores[campo] = `Debe tener al menos ${min} caracteres`;
    }
  }

  if (campoPerfilHabilitado('repositorioIndividual', deshabilitados)) {
    const v = datos.repositorioIndividual;
    if (typeof v !== 'string' || !v.trim().includes('github.com')) {
      errores.repositorioIndividual = 'Debe ser una URL válida de GitHub (github.com)';
    } else {
      try {
        new URL(v.trim());
      } catch {
        errores.repositorioIndividual = 'Debe ser una URL válida de GitHub';
      }
    }
  }

  return errores;
}
