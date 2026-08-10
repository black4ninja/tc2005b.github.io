import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';

export class AppUser extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('AppUser', attributes);
  }

  getEmail(): string {
    return this.get('email') ?? '';
  }

  setEmail(email: string): void {
    this.set('email', email);
  }

  getName(): string {
    return this.get('name') ?? '';
  }

  setName(name: string): void {
    this.set('name', name);
  }

  getUserType(): string {
    return this.get('userType') ?? '';
  }

  setUserType(userType: 'alumno' | 'admin' | 'profesor'): void {
    this.set('userType', userType);
  }

  getMatricula(): string {
    return this.get('matricula') ?? '';
  }

  setMatricula(m: string): void {
    this.set('matricula', m);
  }

  getAttributes(): Record<string, unknown> {
    return this.get('attributes') ?? {};
  }

  setAttributes(attrs: Record<string, unknown>): void {
    this.set('attributes', attrs);
  }

  getPasswordHash(): string {
    return this.get('passwordHash') ?? '';
  }

  setPasswordHash(hash: string): void {
    this.set('passwordHash', hash);
  }

  /**
   * ¿La contraseña actual la puso el SISTEMA (alta manual, import CSV, carga
   * masiva) y no la persona?
   *
   * Sirve para exigir el cambio solo a quien nunca ha elegido la suya. Antes se
   * deducía de `GrupoAlumno.perfilCompleto`, que es POR GRUPO, y eso fallaba por
   * los dos lados: a un alumno con contraseña propia que entra a un grupo nuevo
   * se le volvía a exigir cambiarla, y a uno con la contraseña de fábrica en un
   * grupo cuyo perfil ya había rellenado no se le exigía nunca.
   *
   * Ausente = false = la eligió la persona. Es el default a propósito: los
   * usuarios anteriores a esta marca no se molestan. Quien nace con contraseña
   * generada se marca explícitamente.
   */
  getPasswordAsignada(): boolean {
    return this.get('passwordAsignada') === true;
  }

  setPasswordAsignada(v: boolean): void {
    this.set('passwordAsignada', v);
  }

  getLastLogin(): Date | undefined {
    return this.get('lastLogin');
  }

  setLastLogin(date: Date): void {
    this.set('lastLogin', date);
  }

  isAdmin(): boolean {
    return this.getUserType() === 'admin';
  }

  isAlumno(): boolean {
    return this.getUserType() === 'alumno';
  }

  isProfesor(): boolean {
    return this.getUserType() === 'profesor';
  }

  /** Personal del panel (no alumno): admin o profesor. */
  isStaff(): boolean {
    return this.isAdmin() || this.isProfesor();
  }

  toSafeJSON(extras?: { grupos?: { id: string; name: string }[] }): Record<string, unknown> {
    const grupos = extras?.grupos ?? [];
    return {
      id: this.id,
      email: this.getEmail(),
      name: this.getName(),
      userType: this.getUserType(),
      grupo: grupos[0]?.id ?? '',
      grupos,
      matricula: this.getMatricula(),
      attributes: this.getAttributes(),
      lastLogin: this.getLastLogin(),
      // Para que el panel del alumno sepa si debe EXIGIR el cambio o solo ofrecerlo.
      passwordAsignada: this.getPasswordAsignada(),
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('AppUser', AppUser);
