import { useState, useEffect } from 'react';
import Modal from '../../atoms/Modal/Modal';
import DashButton from '../../atoms/DashButton/DashButton';
import Icon from '../../atoms/Icon/Icon';
import { MODULOS_CONTENIDO } from '../../../../config/modulosContenido';
import type { ColeccionRef } from '../../../../types/contenidos';
import styles from './AsignacionesModal.module.css';

export interface Asignacion {
  coleccionId: string;
  /** Módulos APAGADOS de esta colección para el grupo. */
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
 * Asigna colecciones a un grupo y, por colección, qué partes comparte
 * (Documentación/Páginas/Competencias/Actividades). Filas que se expanden: al
 * asignar una colección aparecen sus módulos, todos encendidos por defecto.
 * Se guarda lo APAGADO — un módulo nuevo del catálogo nace encendido solo.
 */
export default function AsignacionesModal({
  isOpen, grupo, colecciones, onSave, onCancel, loading, error,
}: AsignacionesModalProps) {
  // colecciones asignadas + por colección, el set de módulos apagados.
  const [asignadas, setAsignadas] = useState<Set<string>>(new Set());
  const [apagados, setApagados] = useState<Record<string, Set<string>>>({});

  // Reseed cada vez que se abre para un grupo distinto.
  useEffect(() => {
    if (!grupo) return;
    setAsignadas(new Set((grupo.colecciones ?? []).map((c) => c.id)));
    const off: Record<string, Set<string>> = {};
    for (const [cid, keys] of Object.entries(grupo.modulosDeshabilitados ?? {})) {
      off[cid] = new Set(keys);
    }
    setApagados(off);
  }, [grupo]);

  function toggleColeccion(id: string) {
    setAsignadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id); // al asignar: sin apagados = todos los módulos on
      return next;
    });
  }

  function toggleModulo(coleccionId: string, moduloKey: string) {
    setApagados((prev) => {
      const set = new Set(prev[coleccionId] ?? []);
      if (set.has(moduloKey)) set.delete(moduloKey);
      else set.add(moduloKey);
      return { ...prev, [coleccionId]: set };
    });
  }

  function handleSave() {
    const asignaciones: Asignacion[] = [...asignadas].map((coleccionId) => ({
      coleccionId,
      deshabilitados: [...(apagados[coleccionId] ?? [])],
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
                    const habilitado = !(apagados[c.id]?.has(m.key));
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
