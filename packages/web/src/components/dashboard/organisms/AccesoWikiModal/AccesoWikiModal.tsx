import { useCallback, useEffect, useState } from 'react';
import Modal from '../../atoms/Modal/Modal';
import DashButton from '../../atoms/DashButton/DashButton';
import type { AlumnoPadron } from '../../pages/AlumnosPage/AlumnosPage';
import type { ColeccionRef } from '../../../../types/contenidos';
import styles from './AccesoWikiModal.module.css';

/**
 * Los módulos que se pueden abrir a un alumno sin grupo: los que cuelgan de la
 * colección. Espejo de `MODULOS_INDIVIDUALES` del API.
 */
type ModuloIndividual = 'documentacion' | 'ejercicios' | 'diagramas';

const MODULOS: { key: ModuloIndividual; label: string; icono: string }[] = [
  { key: 'documentacion', label: 'Wiki', icono: 'menu_book' },
  { key: 'ejercicios', label: 'Ejercicios', icono: 'terminal' },
  { key: 'diagramas', label: 'Diagramas', icono: 'account_tree' },
];

interface PermisoIndividual {
  id: string;
  coleccionId: string | null;
  /** Ausente en respuestas de antes del campo: solo el wiki. */
  modulos?: ModuloIndividual[];
  coleccion: { id: string; nombre: string; slug: string | null; clave: string | null; publicada: boolean } | null;
  otorgadoPor: { id: string; name: string; email: string | null } | null;
  createdAt: string;
}

interface AccesoWikiModalProps {
  /** null = cerrado. */
  alumno: AlumnoPadron | null;
  sessionToken: string;
  onClose: () => void;
  /** Para refrescar el contador de la tabla de atrás. */
  onGuardado: () => void;
}

/** coleccionId → módulos abiertos por permiso individual. */
type Seleccion = Map<string, Set<ModuloIndividual>>;

/**
 * Qué tiene abierto un alumno además de lo que le dan sus grupos: por colección,
 * el wiki, los ejercicios y los diagramas. Los demás módulos (competencias,
 * actividades, preguntas, Scrum, Happiness Door) viven en un grupo y no se
 * ofrecen aquí.
 *
 * Se guarda el CONJUNTO entero, no altas y bajas sueltas: así la pantalla y el
 * servidor no pueden discrepar sobre qué quedó.
 *
 * Lo que el alumno ya tiene por su grupo se muestra marcado pero desactivado:
 * darle un permiso individual para algo que ya ve no cambia nada y solo ensucia
 * la lista de accesos que hay que revisar al cierre del semestre.
 */
export default function AccesoWikiModal({ alumno, sessionToken, onClose, onGuardado }: AccesoWikiModalProps) {
  const [colecciones, setColecciones] = useState<ColeccionRef[]>([]);
  const [permisos, setPermisos] = useState<PermisoIndividual[]>([]);
  const [porGrupo, setPorGrupo] = useState<Map<string, Set<ModuloIndividual>>>(new Map());
  const [seleccion, setSeleccion] = useState<Seleccion>(new Map());
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    if (!alumno) return;
    setCargando(true);
    setError('');
    try {
      const [accesoRes, coleccionesRes] = await Promise.all([
        fetch(`/api/admin/alumnos/${alumno.id}/acceso-wiki`, { headers: { 'x-session-token': sessionToken } }),
        fetch('/api/admin/colecciones', { headers: { 'x-session-token': sessionToken } }),
      ]);

      const acceso = await accesoRes.json().catch(() => ({}));
      if (!accesoRes.ok) throw new Error(acceso.message || 'Error al cargar los accesos');
      const cols = coleccionesRes.ok ? await coleccionesRes.json() : { colecciones: [] };

      const lista: PermisoIndividual[] = acceso.permisos ?? [];
      setPermisos(lista);
      const grupo = new Map<string, Set<ModuloIndividual>>();
      for (const [id, modulos] of Object.entries((acceso.modulosPorGrupo ?? {}) as Record<string, ModuloIndividual[]>)) {
        grupo.set(id, new Set(modulos));
      }
      setPorGrupo(grupo);
      const inicial: Seleccion = new Map();
      for (const p of lista) {
        if (p.coleccionId) inicial.set(p.coleccionId, new Set(p.modulos ?? ['documentacion']));
      }
      setSeleccion(inicial);
      setColecciones(cols.colecciones ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [alumno, sessionToken]);

  useEffect(() => {
    if (alumno) cargar();
  }, [alumno, cargar]);

  const delGrupo = (coleccionId: string, modulo: ModuloIndividual) => porGrupo.get(coleccionId)?.has(modulo) ?? false;
  const libres = (coleccionId: string) => MODULOS.filter((m) => !delGrupo(coleccionId, m.key));

  /** Encender una colección abre lo primero que el grupo no le da (normalmente el wiki). */
  function alternarColeccion(coleccionId: string) {
    setSeleccion((prev) => {
      const siguiente = new Map(prev);
      if (siguiente.has(coleccionId)) siguiente.delete(coleccionId);
      else siguiente.set(coleccionId, new Set([libres(coleccionId)[0].key]));
      return siguiente;
    });
  }

  /** Apagar el último módulo apaga la colección: un permiso sin módulos no abre nada. */
  function alternarModulo(coleccionId: string, modulo: ModuloIndividual) {
    setSeleccion((prev) => {
      const siguiente = new Map(prev);
      const modulos = new Set(siguiente.get(coleccionId) ?? []);
      if (modulos.has(modulo)) modulos.delete(modulo);
      else modulos.add(modulo);
      if (modulos.size === 0) siguiente.delete(coleccionId);
      else siguiente.set(coleccionId, modulos);
      return siguiente;
    });
  }

  async function guardar() {
    if (!alumno) return;
    setGuardando(true);
    setError('');
    try {
      const accesos = [...seleccion].map(([coleccionId, modulos]) => ({ coleccionId, modulos: [...modulos] }));
      const res = await fetch(`/api/admin/alumnos/${alumno.id}/acceso-wiki`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken },
        body: JSON.stringify({ accesos }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Error al guardar los accesos');
      await onGuardado();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  /** Quién y cuándo otorgó el permiso vigente sobre esta colección. */
  function rastro(coleccionId: string): string | null {
    const permiso = permisos.find((p) => p.coleccionId === coleccionId);
    if (!permiso) return null;
    const fecha = new Date(permiso.createdAt).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    return permiso.otorgadoPor ? `otorgado el ${fecha} por ${permiso.otorgadoPor.name}` : `otorgado el ${fecha}`;
  }

  return (
    <Modal isOpen={!!alumno} onClose={onClose} title={`Accesos individuales · ${alumno?.name ?? ''}`}>
      <div className={styles.contenido}>
        <p className={styles.ayuda}>
          Se SUMAN a lo que ya le dan sus grupos. Por colección se le puede abrir el wiki, los ejercicios y
          los diagramas. Las competencias, las actividades, las preguntas, Scrum y el Happiness Door
          necesitan un grupo.
        </p>

        {error && <div className={styles.error}>{error}</div>}
        {cargando && <p className={styles.vacio}>Cargando…</p>}

        {!cargando && colecciones.length === 0 && (
          <p className={styles.vacio}>No hay colecciones dadas de alta.</p>
        )}

        {!cargando && colecciones.length > 0 && (
          <ul className={styles.lista}>
            {colecciones.map((coleccion) => {
              const todoPorGrupo = libres(coleccion.id).length === 0;
              const elegidos = seleccion.get(coleccion.id);
              const grupoAlgo = MODULOS.some((m) => delGrupo(coleccion.id, m.key));
              const detalle = rastro(coleccion.id);
              return (
                <li key={coleccion.id} className={styles.fila}>
                  <label className={`${styles.opcion} ${todoPorGrupo ? styles.opcionBloqueada : ''}`}>
                    <input
                      type="checkbox"
                      checked={todoPorGrupo || !!elegidos}
                      disabled={todoPorGrupo || guardando}
                      onChange={() => alternarColeccion(coleccion.id)}
                    />
                    <span className={styles.datos}>
                      <span className={styles.nombre}>
                        {coleccion.clave ? `${coleccion.clave} — ` : ''}
                        {coleccion.nombre}
                      </span>
                      <span className={styles.meta}>
                        {todoPorGrupo
                          ? 'Ya lo tiene todo por su grupo'
                          : detalle ?? (grupoAlgo ? 'Parte la tiene por su grupo' : 'Sin acceso individual')}
                      </span>
                    </span>
                  </label>
                  {elegidos && !todoPorGrupo && (
                    <div className={styles.modulos} role="group" aria-label={`Módulos de ${coleccion.nombre}`}>
                      {MODULOS.map((m) => {
                        const yaPorGrupo = delGrupo(coleccion.id, m.key);
                        return (
                          <label
                            key={m.key}
                            className={`${styles.modulo} ${yaPorGrupo ? styles.opcionBloqueada : ''}`}
                            title={yaPorGrupo ? 'Ya lo tiene por su grupo' : undefined}
                          >
                            <input
                              type="checkbox"
                              checked={yaPorGrupo || elegidos.has(m.key)}
                              disabled={yaPorGrupo || guardando}
                              onChange={() => alternarModulo(coleccion.id, m.key)}
                            />
                            <span className="material-icons" aria-hidden="true">{m.icono}</span>
                            {m.label}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className={styles.acciones}>
          <DashButton variant="outline" onClick={onClose} disabled={guardando}>
            Cancelar
          </DashButton>
          <DashButton onClick={guardar} disabled={guardando || cargando}>
            {guardando ? 'Guardando…' : 'Guardar accesos'}
          </DashButton>
        </div>
      </div>
    </Modal>
  );
}
