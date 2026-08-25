import { useState, useEffect } from 'react';
import Modal from '../../atoms/Modal/Modal';
import DashButton from '../../atoms/DashButton/DashButton';
import Icon from '../../atoms/Icon/Icon';
import { MODULOS_CONTENIDO, moduloEsOptIn } from '../../../../config/modulosContenido';
import { MODULOS_GRUPO } from '../../../../config/modulosGrupo';
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
  modulosGrupo?: string[];
}

interface AsignacionesModalProps {
  isOpen: boolean;
  grupo: GrupoAsignaciones | null;
  /** Todas las colecciones disponibles para asignar. */
  colecciones: ColeccionRef[];
  onSave: (asignaciones: Asignacion[], modulosGrupo: string[]) => void;
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
  // Módulos del grupo: lista plana de lo ENCENDIDO, sin colección de por medio.
  const [delGrupo, setDelGrupo] = useState<Set<string>>(new Set());

  // Reseed cada vez que se abre para un grupo distinto.
  useEffect(() => {
    if (!grupo) return;
    setAsignadas(new Set((grupo.colecciones ?? []).map((c) => c.id)));
    const ov: Record<string, Set<string>> = {};
    for (const [cid, keys] of Object.entries(grupo.modulosDeshabilitados ?? {})) {
      ov[cid] = new Set(keys);
    }
    setOverrides(ov);
    setDelGrupo(new Set(grupo.modulosGrupo ?? []));
  }, [grupo]);

  function toggleModuloGrupo(key: string) {
    const next = new Set(delGrupo);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setDelGrupo(next);
  }

  /** ¿Está encendido el módulo para esta colección? (respeta el default por módulo) */
  function estaHabilitado(coleccionId: string, moduloKey: string): boolean {
    const presente = overrides[coleccionId]?.has(moduloKey) ?? false;
    return moduloEsOptIn(moduloKey) ? presente : !presente;
  }

  function toggleColeccion(id: string) {
    const next = new Set(asignadas);
    if (next.has(id)) {
      next.delete(id);
      setAsignadas(next);
      return;
    }
    next.add(id); // al asignar: sin overrides = cada módulo en su default
    setAsignadas(next);

    // …salvo Competencias, que nace ENCENDIDA: sin esto, asignar una segunda
    // colección dejaría al grupo con dos catálogos de competencias sin que nadie
    // haya tocado nada. La que ya las aportaba manda; la nueva entra apagada.
    if ([...asignadas].some((cid) => estaHabilitado(cid, 'competencias'))) {
      const set = new Set(overrides[id] ?? []);
      set.add('competencias'); // default-on: presente = apagada
      setOverrides({ ...overrides, [id]: set });
    }
  }

  function toggleModulo(coleccionId: string, moduloKey: string) {
    const nuevoEncendido = !estaHabilitado(coleccionId, moduloKey);
    // Se guarda la key solo si el nuevo estado DIFIERE del default del módulo.
    const debeGuardar = moduloEsOptIn(moduloKey) ? nuevoEncendido : !nuevoEncendido;

    const next: Record<string, Set<string>> = {};
    for (const [cid, keys] of Object.entries(overrides)) next[cid] = new Set(keys);

    const set = new Set(next[coleccionId] ?? []);
    if (debeGuardar) set.add(moduloKey);
    else set.delete(moduloKey);
    next[coleccionId] = set;

    // Competencias es EXCLUYENTE: el grupo evalúa una sola materia, y la malla
    // del alumno es una lista, no una por colección. Encenderla aquí la apaga en
    // las demás, en vez de dejar que el servidor rechace el guardado: quien lo
    // usa no tiene por qué adivinar cuál sobra.
    if (moduloKey === 'competencias' && nuevoEncendido) {
      for (const otra of asignadas) {
        if (otra === coleccionId) continue;
        const otras = new Set(next[otra] ?? []);
        otras.add('competencias'); // default-on: presente = apagada
        next[otra] = otras;
      }
    }
    setOverrides(next);
  }

  function handleSave() {
    const asignaciones: Asignacion[] = [...asignadas].map((coleccionId) => ({
      coleccionId,
      deshabilitados: [...(overrides[coleccionId] ?? [])],
    }));
    onSave(asignaciones, [...delGrupo]);
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
      {/* Se dice antes de que pase: encender Competencias apaga la de las demás,
          y sin avisar parecería que se desmarcó solo. */}
      {asignadas.size > 1 && (
        <p className={styles.nota}>
          <Icon name="info" size="sm" />
          El grupo evalúa las competencias de <strong>una sola</strong> colección: la malla del
          alumno es una lista, no una por materia. Al encenderla en una se apaga en las demás.
        </p>
      )}

      {/* Arriba y separado de las colecciones a propósito: no cuelgan de
          ninguna, y mezclarlos con los módulos de una colección haría pensar
          que se encienden por materia. */}
      <div className={styles.grupoModulos}>
        <span className={styles.grupoModulosTitulo}>Módulos del grupo</span>
        {MODULOS_GRUPO.map((m) => (
          <label key={m.key} className={styles.moduloGrupo} title={m.ayuda}>
            <input
              type="checkbox"
              checked={delGrupo.has(m.key)}
              onChange={() => toggleModuloGrupo(m.key)}
              disabled={loading}
            />
            <Icon name={m.icon} size="sm" />
            <span><strong>{m.label}</strong> — {m.ayuda}</span>
          </label>
        ))}
      </div>

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
