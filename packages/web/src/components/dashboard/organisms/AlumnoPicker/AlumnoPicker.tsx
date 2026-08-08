import { useCallback, useEffect, useRef, useState } from 'react';
import TextInput from '../../atoms/TextInput/TextInput';
import DashButton from '../../atoms/DashButton/DashButton';
import styles from './AlumnoPicker.module.css';

/** Alumno del padrón tal y como lo devuelve `/alumnos/buscar`. */
export interface AlumnoEncontrado {
  id: string;
  name: string;
  email: string;
  matricula: string;
  /** Ya está en el grupo y activo: no hay nada que agregar. */
  enGrupo: boolean;
  /** Estuvo en el grupo y se le dio de baja: agregarlo lo REACTIVA. */
  baja: boolean;
}

interface AlumnoPickerProps {
  grupoId: string;
  sessionToken: string;
  /** Agrega al alumno al grupo. Debe lanzar si falla, para pintar el error aquí. */
  onAsignar: (alumno: AlumnoEncontrado) => Promise<void>;
  onCancel: () => void;
}

/** Caracteres mínimos, en sintonía con el `BUSCAR_MIN` del servidor. */
const MIN = 2;
/** Espera tras la última tecla antes de consultar. */
const DEBOUNCE_MS = 300;

/**
 * Busca un alumno YA EXISTENTE (por matrícula, nombre o correo) y lo mete al
 * grupo. Es la alternativa a "Crear nuevo": el alta por correo ya reutilizaba al
 * alumno existente, pero sin buscador había que saberse el correo exacto, y
 * teclearlo con una letra de más creaba un alumno duplicado con historial vacío.
 */
export default function AlumnoPicker({ grupoId, sessionToken, onAsignar, onCancel }: AlumnoPickerProps) {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<AlumnoEncontrado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState('');
  const [asignandoId, setAsignandoId] = useState('');
  /** Búsqueda ya resuelta: sin esto, "sin resultados" aparece antes de buscar. */
  const [buscado, setBuscado] = useState('');

  // Cada búsqueda lleva su número: si una lenta responde después de otra más
  // reciente, se descarta en vez de pisar los resultados buenos.
  const peticion = useRef(0);

  const buscar = useCallback(async (texto: string) => {
    const mia = ++peticion.current;
    setBuscando(true);
    setError('');
    try {
      const res = await fetch(
        `/api/admin/grupos/${grupoId}/alumnos/buscar?q=${encodeURIComponent(texto)}`,
        { headers: { 'x-session-token': sessionToken } },
      );
      const data = await res.json().catch(() => ({}));
      if (mia !== peticion.current) return;
      if (!res.ok) throw new Error(data.message || 'Error al buscar');
      setResultados(data.alumnos ?? []);
      setBuscado(texto);
    } catch (err: any) {
      if (mia !== peticion.current) return;
      setError(err.message);
      setResultados([]);
    } finally {
      if (mia === peticion.current) setBuscando(false);
    }
  }, [grupoId, sessionToken]);

  useEffect(() => {
    const texto = q.trim();
    if (texto.length < MIN) {
      peticion.current++; // invalida cualquier respuesta en vuelo
      setResultados([]);
      setBuscado('');
      setBuscando(false);
      return;
    }
    const t = setTimeout(() => buscar(texto), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q, buscar]);

  async function asignar(alumno: AlumnoEncontrado) {
    setAsignandoId(alumno.id);
    setError('');
    try {
      await onAsignar(alumno);
    } catch (err: any) {
      setError(err.message || 'Error al agregar el alumno');
    } finally {
      setAsignandoId('');
    }
  }

  const textoBuscado = q.trim();
  const sinResultados = buscado === textoBuscado && textoBuscado.length >= MIN && resultados.length === 0 && !buscando;

  return (
    <div className={styles.picker}>
      <TextInput
        label="Buscar alumno"
        placeholder="Matrícula, nombre o correo"
        icon="search"
        value={q}
        onChange={setQ}
      />
      <p className={styles.hint}>
        Busca entre los alumnos ya dados de alta en el sistema, aunque sean de otro grupo o de un
        semestre anterior. Se conserva su historial y su contraseña.
      </p>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.resultados}>
        {textoBuscado.length < MIN && (
          <p className={styles.vacio}>Escribe al menos {MIN} caracteres.</p>
        )}
        {buscando && <p className={styles.vacio}>Buscando…</p>}
        {sinResultados && (
          <p className={styles.vacio}>
            Ningún alumno coincide con “{textoBuscado}”. Si es de primer ingreso, créalo desde la
            otra pestaña.
          </p>
        )}
        {!buscando && resultados.map((alumno) => (
          <div key={alumno.id} className={styles.fila}>
            <div className={styles.datos}>
              <span className={styles.nombre}>{alumno.name}</span>
              <span className={styles.meta}>
                {alumno.matricula || 'sin matrícula'} · {alumno.email}
              </span>
            </div>
            {alumno.enGrupo ? (
              <span className={styles.yaEsta}>Ya está en el grupo</span>
            ) : (
              <DashButton
                onClick={() => asignar(alumno)}
                disabled={asignandoId !== ''}
              >
                {asignandoId === alumno.id ? 'Agregando…' : alumno.baja ? 'Reactivar' : 'Agregar'}
              </DashButton>
            )}
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <DashButton variant="outline" onClick={onCancel} disabled={asignandoId !== ''}>
          Cancelar
        </DashButton>
      </div>
    </div>
  );
}
