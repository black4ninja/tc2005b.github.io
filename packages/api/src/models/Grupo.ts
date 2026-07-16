import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';

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

  getFechaInicio(): Date | undefined {
    return this.get('fechaInicio');
  }
  setFechaInicio(date: Date): void {
    this.set('fechaInicio', date);
  }

  getFechaFin(): Date | undefined {
    return this.get('fechaFin');
  }
  setFechaFin(date: Date): void {
    this.set('fechaFin', date);
  }

  getSalon(): string {
    return this.get('salon') ?? '';
  }
  setSalon(salon: string): void {
    this.set('salon', salon);
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

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.getName(),
      fechaInicio: this.getFechaInicio(),
      fechaFin: this.getFechaFin(),
      salon: this.getSalon(),
      urlAgendaEntrevistas: this.getUrlAgendaEntrevistas() ?? null,
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
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('Grupo', Grupo);
