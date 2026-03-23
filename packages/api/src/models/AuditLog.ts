import Parse from 'parse/node';

export interface AuditLogParams {
  entidad: string;
  entidadId: string;
  grupoId: string;
  alumnoId: string;
  usuarioId: string;
  usuarioNombre: string;
  rol: 'admin' | 'alumno';
  accion: string;
  cambios: Record<string, { antes: any; despues: any }>;
}

export class AuditLog extends Parse.Object {
  constructor(attributes?: Parse.Attributes) {
    super('AuditLog', attributes);
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      entidad: this.get('entidad'),
      entidadId: this.get('entidadId'),
      grupoId: this.get('grupoId'),
      alumnoId: this.get('alumnoId'),
      usuarioId: this.get('usuarioId'),
      usuarioNombre: this.get('usuarioNombre'),
      rol: this.get('rol'),
      accion: this.get('accion'),
      cambios: this.get('cambios'),
      createdAt: this.createdAt,
    };
  }
}

Parse.Object.registerSubclass('AuditLog', AuditLog);

export async function registrarLog(params: AuditLogParams): Promise<void> {
  try {
    const log = new AuditLog();
    log.set('entidad', params.entidad);
    log.set('entidadId', params.entidadId);
    log.set('grupoId', params.grupoId);
    log.set('alumnoId', params.alumnoId);
    log.set('usuarioId', params.usuarioId);
    log.set('usuarioNombre', params.usuarioNombre);
    log.set('rol', params.rol);
    log.set('accion', params.accion);
    log.set('cambios', params.cambios);
    await log.save(null, { useMasterKey: true });
  } catch (err) {
    console.error('Error registrando audit log:', err);
  }
}
