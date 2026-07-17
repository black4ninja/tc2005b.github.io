import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { NOMBRE_LENGUAJE } from '../../config/codemirrorLenguaje';
import styles from './EjerciciosAlumno.module.css';

interface EjercicioLista {
  id: string;
  titulo: string;
  slug: string;
  lenguajes: string[];
  orden: number;
}

interface ColeccionRef {
  slug: string;
  nombre: string;
  clave: string | null;
}

/** Lista de ejercicios de una colección para el alumno (mini-juez). */
export default function EjerciciosAlumnoPage() {
  const { slug } = useParams<{ slug: string }>();
  const { sessionToken } = useAuth();
  const [coleccion, setColeccion] = useState<ColeccionRef | null>(null);
  const [ejercicios, setEjercicios] = useState<EjercicioLista[]>([]);
  const [cargando, setCargando] = useState(true);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [error, setError] = useState(false);
  const [reintento, setReintento] = useState(0);

  useEffect(() => {
    if (!slug || !sessionToken) return;
    setCargando(true);
    setError(false);
    // Timeout: si el API no responde (p. ej. reiniciando en dev) no queremos un
    // "Cargando…" eterno; se aborta y se muestra un error con reintentar.
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    fetch(`/api/contenidos/${slug}/ejercicios`, { headers: { 'x-session-token': sessionToken }, signal: ctrl.signal })
      .then((r) => {
        if (r.status === 404) { setNoEncontrado(true); return null; }
        if (!r.ok) { setError(true); return null; }
        return r.json();
      })
      .then((json) => {
        if (json) {
          setColeccion(json.coleccion ?? null);
          setEjercicios(json.ejercicios ?? []);
        }
      })
      .catch(() => setError(true))
      .finally(() => { clearTimeout(t); setCargando(false); });
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [slug, sessionToken, reintento]);

  if (cargando) return <div className={styles.page}><p className={styles.info}>Cargando…</p></div>;
  if (error) {
    return (
      <div className={styles.page}>
        <p className={styles.info}>No se pudo cargar. Revisa tu conexión e inténtalo de nuevo.</p>
        <button
          className={styles.volver}
          style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
          onClick={() => setReintento((n) => n + 1)}
        >
          Reintentar
        </button>
      </div>
    );
  }
  if (noEncontrado) {
    return (
      <div className={styles.page}>
        <p className={styles.info}>No se encontró esta sección de ejercicios.</p>
        <Link to="/alumno" className={styles.volver}>Volver</Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to={`/contenidos/${slug}/`} className={styles.volver}>← {coleccion?.clave || coleccion?.nombre || 'Contenidos'}</Link>
        <h1 className={styles.titulo}>Ejercicios</h1>
      </header>

      {ejercicios.length === 0 ? (
        <p className={styles.info}>Aún no hay ejercicios publicados en esta colección.</p>
      ) : (
        <ul className={styles.lista}>
          {ejercicios.map((e) => (
            <li key={e.id}>
              <Link to={`/contenidos/${slug}/ejercicios/${e.slug}`} className={styles.item}>
                <span className={styles.itemTitulo}>{e.titulo}</span>
                <span className={styles.itemLeng}>
                  {e.lenguajes.map((l) => NOMBRE_LENGUAJE[l] ?? l).join(' · ')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
