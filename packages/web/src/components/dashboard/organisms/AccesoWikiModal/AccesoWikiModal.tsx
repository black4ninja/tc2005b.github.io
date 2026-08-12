import { useCallback, useEffect, useState } from 'react';
import Modal from '../../atoms/Modal/Modal';
import DashButton from '../../atoms/DashButton/DashButton';
import type { AlumnoPadron } from '../../pages/AlumnosPage/AlumnosPage';
import type { ColeccionRef } from '../../../../types/contenidos';
import styles from './AccesoWikiModal.module.css';

interface PermisoIndividual {
  id: string;
  coleccionId: string | null;
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

/**
 * Qué wikis tiene abiertas un alumno además de las de sus grupos.
 *
 * Se marca con casillas y se guarda el CONJUNTO entero, no altas y bajas
 * sueltas: así la pantalla y el servidor no pueden discrepar sobre qué quedó.
 *
 * Las colecciones que el alumno ya tiene por su grupo se muestran, pero
 * desactivadas: darle un permiso individual para algo que ya ve no cambia nada
 * y solo ensucia la lista de accesos que hay que revisar al cierre del semestre.
 */
export default function AccesoWikiModal({ alumno, sessionToken, onClose, onGuardado }: AccesoWikiModalProps) {
  const [colecciones, setColecciones] = useState<ColeccionRef[]>([]);
  const [permisos, setPermisos] = useState<PermisoIndividual[]>([]);
  const [porGrupo, setPorGrupo] = useState<Set<string>>(new Set());
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const headers = { 'Content-Type': 'application/json', 'x-session-token': sessionToken };

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

      setPermisos(acceso.permisos ?? []);
      setPorGrupo(new Set<string>(acceso.coleccionIdsPorGrupo ?? []));
      setSeleccion(
        new Set<string>(
          (acceso.permisos ?? [])
            .map((p: PermisoIndividual) => p.coleccionId)
            .filter((id: string | null): id is string => !!id),
        ),
      );
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

  function alternar(coleccionId: string) {
    setSeleccion((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(coleccionId)) siguiente.delete(coleccionId);
      else siguiente.add(coleccionId);
      return siguiente;
    });
  }

  async function guardar() {
    if (!alumno) return;
    setGuardando(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/alumnos/${alumno.id}/acceso-wiki`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ coleccionIds: [...seleccion] }),
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
    <Modal isOpen={!!alumno} onClose={onClose} title={`Accesos al wiki · ${alumno?.name ?? ''}`}>
      <div className={styles.contenido}>
        <p className={styles.ayuda}>
          Estas colecciones se SUMAN a las que ya le dan sus grupos. Solo abren el wiki: las
          competencias, las actividades y los ejercicios siguen dependiendo del grupo.
        </p>

        {error && <div className={styles.error}>{error}</div>}
        {cargando && <p className={styles.vacio}>Cargando…</p>}

        {!cargando && colecciones.length === 0 && (
          <p className={styles.vacio}>No hay colecciones dadas de alta.</p>
        )}

        {!cargando && colecciones.length > 0 && (
          <ul className={styles.lista}>
            {colecciones.map((coleccion) => {
              const yaPorGrupo = porGrupo.has(coleccion.id);
              const detalle = rastro(coleccion.id);
              return (
                <li key={coleccion.id} className={styles.fila}>
                  <label className={`${styles.opcion} ${yaPorGrupo ? styles.opcionBloqueada : ''}`}>
                    <input
                      type="checkbox"
                      checked={yaPorGrupo || seleccion.has(coleccion.id)}
                      disabled={yaPorGrupo || guardando}
                      onChange={() => alternar(coleccion.id)}
                    />
                    <span className={styles.datos}>
                      <span className={styles.nombre}>
                        {coleccion.clave ? `${coleccion.clave} — ` : ''}
                        {coleccion.nombre}
                      </span>
                      <span className={styles.meta}>
                        {yaPorGrupo
                          ? 'Ya la tiene por su grupo'
                          : detalle ?? 'Sin acceso individual'}
                      </span>
                    </span>
                  </label>
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
