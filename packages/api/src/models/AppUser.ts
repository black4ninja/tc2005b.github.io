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

  setUserType(userType: 'alumno' | 'admin'): void {
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
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('AppUser', AppUser);
