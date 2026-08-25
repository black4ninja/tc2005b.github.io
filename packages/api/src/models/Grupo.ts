import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import { COLOR_POR_DEFECTO } from './CategoriaGrupo.js';

export class Grupo extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('Grupo', attributes);
  }

  getName(): string {
    return this.get('name') ?? '';
  }
  setName(name: string): void {
    this.set('name', name);
  }

  /**
   * Inicio y fin del grupo. Son fechas de CALENDARIO, sin hora: el día en que
   * arranca el semestre, no un instante. Parse solo tiene `Date`, así que se
   * guardan canónicamente a **medianoche UTC** (`2026-08-10T00:00:00Z`) y hay
   * que leerlas y pintarlas en UTC. Interpretarlas en la zona del navegador
   * las corre un día hacia atrás en todo México: ver `parseFechaDia()` en
   * grupos.controller y `formatDate()` en GruposPage.
   *
   * `undefined` QUITA el campo (unset), que es como se borra una fecha ya
   * puesta: un `set(campo, undefined)` no lo elimina del objeto.
   */
  getFechaInicio(): Date | undefined {
    return this.get('fechaInicio');
  }
  setFechaInicio(date: Date | undefined): void {
    if (date === undefined) this.unset('fechaInicio');
    else this.set('fechaInicio', date);
  }

  getFechaFin(): Date | undefined {
    return this.get('fechaFin');
  }
  setFechaFin(date: Date | undefined): void {
    if (date === undefined) this.unset('fechaFin');
    else this.set('fechaFin', date);
  }

  getSalon(): string {
    return this.get('salon') ?? '';
  }
  setSalon(salon: string): void {
    this.set('salon', salon);
  }

  /**
   * Categoría a la que pertenece el grupo (la materia o el nivel). De ella sale
   * el color con que se pinta el grupo en tablas y selectores.
   *
   * Es OPCIONAL, y tiene que seguir siéndolo: los grupos creados antes de que
   * existiera el catálogo no tienen ninguna, y deben poder editarse y usarse sin
   * asignarles una. `setCategoria(null)` hace `unset` — un `set(campo, null)`
   * dejaría el campo puesto a null y el `include` traería un pointer roto.
   */
  getCategoria(): Parse.Object | undefined {
    return this.get('categoria');
  }
  setCategoria(categoria: Parse.Object | null): void {
    if (categoria) this.set('categoria', categoria);
    else this.unset('categoria');
  }

  /**
   * URL de la agenda de entrevistas del grupo (p. ej. una hoja de cálculo).
   * Opcional: sin ella, el ítem "Agendar Entrevistas" no aparece en el menú.
   *
   * ⚠️ Se renderiza como `<a href>`, así que el controlador SOLO acepta
   * `http`/`https`. Un `javascript:` aquí sería XSS en la sesión del admin o del
   * alumno. Ver `sanitizarUrl()` en grupos.controller.
   */
  getUrlAgendaEntrevistas(): string | undefined {
    return this.get('urlAgendaEntrevistas');
  }
  setUrlAgendaEntrevistas(url: string): void {
    this.set('urlAgendaEntrevistas', url);
  }

  /**
   * Colecciones del CMS "Contenidos" asignadas al grupo (array de pointers —
   * pointers, nunca strings). El acceso del alumno =
   * unión de las colecciones de sus grupos activos. La UI de asignación y la
   * migración llegan en la US-6; el visor (US-3) ya lee este campo.
   */
  getColecciones(): Parse.Object[] {
    return this.get('colecciones') ?? [];
  }
  setColecciones(colecciones: Parse.Object[]): void {
    this.set('colecciones', colecciones);
  }

  /**
   * Administradores (AppUser userType='admin') asignados al grupo — array de
   * pointers, como `colecciones`. Es una asociación ORGANIZATIVA: no cambia el
   * acceso (todo admin ve todos los grupos), solo registra quién está a cargo.
   * Se gestiona de forma bidireccional: desde el grupo y desde el admin.
   */
  getAdmins(): Parse.Object[] {
    return this.get('admins') ?? [];
  }
  setAdmins(admins: Parse.Object[]): void {
    this.set('admins', admins);
  }

  /**
   * Módulos APAGADOS por colección: `{ [coleccionId]: string[] }`. Un módulo de
   * una colección asignada está habilitado salvo que su key esté aquí. Ausente =
   * nada apagado = todo habilitado (compatibilidad + módulos nuevos nacen on).
   * Ver `moduloHabilitado` y `src/models/modulos-contenido.ts`.
   */
  getModulosDeshabilitados(): Record<string, string[]> {
    return this.get('modulosDeshabilitados') ?? {};
  }
  setModulosDeshabilitados(mapa: Record<string, string[]>): void {
    this.set('modulosDeshabilitados', mapa);
  }

  /**
   * Anulación del tiempo de las preguntas de entrevista para ESTE grupo, en
   * segundos. Ausente = el de la materia (`Coleccion.preguntasDuracionSegundos`)
   * y, si tampoco lo tiene, el del módulo.
   *
   * Existe porque el mismo temario se entrevista distinto según el grupo: uno de
   * treinta y cinco no puede dar el mismo tiempo por cabeza que uno de doce.
   */
  getPreguntasDuracionSegundos(): number | undefined {
    return this.get('preguntasDuracionSegundos');
  }
  setPreguntasDuracionSegundos(segundos: number | undefined): void {
    if (segundos === undefined) this.unset('preguntasDuracionSegundos');
    else this.set('preguntasDuracionSegundos', segundos);
  }

  /**
   * Campos del perfil del alumno que ESTE grupo no pide. Ausente o vacío = los
   * pide todos, que es el comportamiento de siempre (cero migración).
   *
   * Un campo apagado sale del formulario Y de la regla que marca el perfil como
   * completo: si no se pide, no puede bloquear el acceso del alumno. Solo se
   * pueden apagar los de `CAMPOS_DESACTIVABLES` (ver `campos-perfil.ts`).
   */
  getCamposPerfilDeshabilitados(): string[] {
    return this.get('camposPerfilDeshabilitados') ?? [];
  }
  setCamposPerfilDeshabilitados(campos: string[]): void {
    this.set('camposPerfilDeshabilitados', campos);
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.getName(),
      fechaInicio: this.getFechaInicio(),
      fechaFin: this.getFechaFin(),
      salon: this.getSalon(),
      urlAgendaEntrevistas: this.getUrlAgendaEntrevistas() ?? null,
      // Requiere query.include('categoria'). Se manda desplegada (y no solo el
      // id) porque quien pinta la lista necesita el color en el mismo viaje: si
      // no, la tabla aparece en gris y se recolorea después.
      categoria: categoriaSafeJSON(this.getCategoria()),
      // Requiere query.include('colecciones'); las soft-deleted no se exponen.
      colecciones: this.getColecciones()
        .filter((c) => c && c.get('exists') !== false)
        .map((c) => ({
          id: c.id,
          nombre: c.get('nombre') ?? null,
          slug: c.get('slug') ?? null,
          clave: c.get('clave') ?? null,
        })),
      // Requiere query.include('admins'); los soft-deleted no se exponen.
      admins: this.getAdmins()
        .filter((a) => a && a.get('exists') !== false)
        .map((a) => ({
          id: a.id,
          name: a.get('name') ?? null,
          email: a.get('email') ?? null,
        })),
      // Módulos apagados por colección (para que la UI y el sidebar sepan qué está
      // habilitado). Vacío = todo habilitado.
      modulosDeshabilitados: this.getModulosDeshabilitados(),
      preguntasDuracionSegundos: this.getPreguntasDuracionSegundos() ?? null,
      // Campos del perfil que este grupo NO pide (vacío = los pide todos).
      camposPerfilDeshabilitados: this.getCamposPerfilDeshabilitados(),
      active: this.get('active'),
      // El borrado es lógico: con `?estado=eliminados|todos` el listado devuelve
      // grupos borrados y la UI necesita distinguirlos de un simple inactivo.
      exists: this.get('exists') !== false,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

/**
 * La categoría tal y como la consume la interfaz, o `null`.
 *
 * Devuelve `null` también cuando la categoría fue borrada (`exists: false`):
 * el pointer sobrevive al borrado lógico y sin este filtro un grupo seguiría
 * pintándose con el color de una categoría que ya no está en el catálogo.
 */
function categoriaSafeJSON(
  categoria: Parse.Object | undefined,
): { id: string; nombre: string; color: string } | null {
  if (!categoria || categoria.get('exists') === false) return null;
  // Sin `include` llega el pointer sin datos: mejor null que una fila en blanco.
  if (!categoria.get('nombre')) return null;
  return {
    id: categoria.id!,
    nombre: categoria.get('nombre'),
    color: categoria.get('color') ?? COLOR_POR_DEFECTO,
  };
}

Parse.Object.registerSubclass('Grupo', Grupo);
