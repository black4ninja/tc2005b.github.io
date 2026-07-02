/**
 * Caches TTL mínimos del patrón de permisos (valor global + mapa por clave).
 * Extraído para no copiar el andamiaje {value, expires} en cada servicio.
 * (materia.service conserva su copia original: se retira junto con el gate
 * de Docusaurus en la US-7 — no vale la pena migrarlo.)
 */

/** Un único valor cacheado con TTL (p. ej. el mapa global de slugs). */
export class TtlValue<T> {
  private entry: { value: T; expires: number } | null = null;

  constructor(private readonly ttlMs: number) {}

  get(): T | null {
    if (this.entry && this.entry.expires > Date.now()) return this.entry.value;
    return null;
  }

  set(value: T): void {
    this.entry = { value, expires: Date.now() + this.ttlMs };
  }

  invalidate(): void {
    this.entry = null;
  }
}

/** Mapa clave→valor con TTL por entrada (p. ej. permisos por usuario). */
export class TtlMap<T> {
  private readonly entries = new Map<string, { value: T; expires: number }>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | null {
    const entry = this.entries.get(key);
    if (entry && entry.expires > Date.now()) return entry.value;
    return null;
  }

  set(key: string, value: T): void {
    this.entries.set(key, { value, expires: Date.now() + this.ttlMs });
  }

  invalidate(key?: string): void {
    if (key !== undefined) this.entries.delete(key);
    else this.entries.clear();
  }
}
