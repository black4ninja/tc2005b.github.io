import { useState, useEffect } from 'react';
import Modal from '../../atoms/Modal/Modal';
import DashButton from '../../atoms/DashButton/DashButton';
import Icon from '../../atoms/Icon/Icon';
import { MODULOS_CONTENIDO, moduloEsOptIn, moduloHabilitado } from '../../../../config/modulosContenido';
import type { ColeccionRef } from '../../../../types/contenidos';
import styles from './AsignacionesModal.module.css';

export interface Asignacion {
  coleccionId: string;
  /**
   * Overrides al default de cada módulo para esta colección: para los módulos
   * default-on lista los APAGADOS; para los opt-in (Ejercicios) lista los
   * ENCENDIDOS. Lo interpreta `moduloHabilitado`.
   */
  deshabilitados: string[];
}

interface GrupoAsignaciones {
  id: string;
  name: string;
  colecciones?: ColeccionRef[];
  modulosDeshabilitados?: Record<string, string[]>;
}

interface AsignacionesModalProps {
  isOpen: boolean;
  grupo: GrupoAsignaciones | null;
  /** Todas las colecciones disponibles para asignar. */
  colecciones: ColeccionRef[];
  onSave: (asignaciones: Asignacion[]) => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string;
}

/**
 * Asigna colecciones a un grupo y, por colección, qué partes comparte. Filas que
 * se expanden: al asignar una colección aparecen sus módulos. Los módulos
 * default-on nacen encendidos; los opt-in (Ejercicios) nacen apagados. Se guarda
 * solo lo que DIFIERE del default de cada módulo.
 */
export default function AsignacionesModal({
  isOpen, grupo, colecciones, onSave, onCancel, loading, error,
}: AsignacionesModalProps) {
  // colecciones asignadas + por colección, el set de overrides guardado (crudo).
  const [asignadas, setAsignadas] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, Set<string>>>({});

  // Reseed cada vez que se abre para un grupo distinto.
  useEffect(() => {
    if (!grupo) return;
    setAsignadas(new Set((grupo.colecciones ?? []).map((c) => c.id)));
    const ov: Record<string, Set<string>> = {};
    for (const [cid, keys] of Object.entries(grupo.modulosDeshabilitados ?? {})) {
      ov[cid] = new Set(keys);
    }
    setOverrides(ov);
  }, [grupo]);

  /** ¿Está encendido el módulo para esta colección? (respeta el default por módulo) */
  function estaHabilitado(coleccionId: string, moduloKey: string): boolean {
    const presente = overrides[coleccionId]?.has(moduloKey) ?? false;
    return moduloEsOptIn(moduloKey) ? presente : !presente;
  }

  function toggleColeccion(id: string) {
    setAsignadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id); // al asignar: sin overrides = cada módulo en su default
      return next;
    });
  }

  function toggleModulo(coleccionId: string, moduloKey: string) {
    const nuevoEncendido = !estaHabilitado(coleccionId, moduloKey);
    // Se guarda la key solo si el nuevo estado DIFIERE del default del módulo.
    const debeGuardar = moduloEsOptIn(moduloKey) ? nuevoEncendido : !nuevoEncendido;
    setOverrides((prev) => {
      const set = new Set(prev[coleccionId] ?? []);
      if (debeGuardar) set.add(moduloKey);
      else set.delete(moduloKey);
      return { ...prev, [coleccionId]: set };
    });
  }

  function handleSave() {
    const asignaciones: Asignacion[] = [...asignadas].map((coleccionId) => ({
      coleccionId,
      deshabilitados: [...(overrides[coleccionId] ?? [])],
    }));
    onSave(asignaciones);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={grupo ? `Asignaciones — ${grupo.name}` : 'Asignaciones'}
      wide
    >
      {error && <div className={styles.error}>{error}</div>}
      <p className={styles.intro}>
        Elige qué colecciones ve este grupo y, de cada una, qué partes comparte.
      </p>

      <div className={styles.lista}>
        {colecciones.length === 0 && (
          <span className={styles.hint}>No hay colecciones disponibles.</span>
        )}
        {colecciones.map((c) => {
          const clave = c.clave || c.slug.toUpperCase();
          const asignada = asignadas.has(c.id);
          return (
            <div key={c.id} className={styles.fila}>
              <label className={styles.coleccion}>
                <input
                  type="checkbox"
                  checked={asignada}
                  onChange={() => toggleColeccion(c.id)}
                  disabled={loading}
                />
                <span className={styles.coleccionLabel} title={`${clave} — ${c.nombre}`}>
                  <strong>{clave}</strong> — {c.nombre}
                </span>
              </label>

              {asignada && (
                <div className={styles.modulos}>
                  {MODULOS_CONTENIDO.map((m) => {
                    const habilitado = estaHabilitado(c.id, m.key);
                    return (
                      <label key={m.key} className={styles.modulo}>
                        <input
                          type="checkbox"
                          checked={habilitado}
                          onChange={() => toggleModulo(c.id, m.key)}
                          disabled={loading}
                        />
                        <Icon name={m.icon} size="sm" />
                        <span>{m.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.actions}>
        <DashButton variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </DashButton>
        <DashButton onClick={handleSave} disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar'}
        </DashButton>
      </div>
    </Modal>
  );
}
