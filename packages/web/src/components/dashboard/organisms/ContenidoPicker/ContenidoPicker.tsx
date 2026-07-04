import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import Modal from '../../atoms/Modal/Modal';
import styles from './ContenidoPicker.module.css';

const API_BASE = '/api';

interface Nodo {
  id: string;
  titulo: string;
  slug: string;
  tipo: string;
  hijos: Nodo[];
}
interface Coleccion {
  id: string;
  slug: string;
  nombre: string;
  clave?: string | null;
}
interface PaginaPlana {
  path: string;
  label: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Recibe la ruta interna del visor, p. ej. `/contenidos/tc2005b/backend/.../readme`. */
  onSelect: (enlace: string) => void;
}

/** Aplana el árbol del visor a páginas (no categorías) con su path y breadcrumb. */
function aplanar(arbol: Nodo[], prefijoPath = '', prefijoLabel: string[] = []): PaginaPlana[] {
  const out: PaginaPlana[] = [];
  for (const n of arbol) {
    const path = prefijoPath ? `${prefijoPath}/${n.slug}` : n.slug;
    const label = [...prefijoLabel, n.titulo];
    if (n.tipo === 'categoria') out.push(...aplanar(n.hijos, path, label));
    else out.push({ path, label: label.join(' / ') });
  }
  return out;
}

/**
 * Selector de contenido del CMS "Contenidos" para enlazar desde las páginas
 * del sitio (bloque Práctica). Evita teclear/investigar la ruta: el usuario
 * elige colección → página publicada y devolvemos la ruta del visor. Reusa los
 * endpoints existentes (`/admin/colecciones` + `/contenidos/:slug/arbol`).
 */
export default function ContenidoPicker({ isOpen, onClose, onSelect }: Props) {
  const { sessionToken } = useAuth();
  const [colecciones, setColecciones] = useState<Coleccion[]>([]);
  const [slug, setSlug] = useState('');
  const [paginas, setPaginas] = useState<PaginaPlana[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    fetch(`${API_BASE}/admin/colecciones`, { headers: { 'x-session-token': sessionToken ?? '' } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setColecciones(d.colecciones ?? []))
      .catch(() => setError('No se pudieron cargar las colecciones.'));
  }, [isOpen, sessionToken]);

  useEffect(() => {
    if (!slug) {
      setPaginas([]);
      return;
    }
    setLoading(true);
    setError('');
    fetch(`${API_BASE}/contenidos/${slug}/arbol`, { headers: { 'x-session-token': sessionToken ?? '' } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setPaginas(aplanar(d.arbol ?? [])))
      .catch(() => setError('No se pudo cargar el contenido de la colección.'))
      .finally(() => setLoading(false));
  }, [slug, sessionToken]);

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return paginas;
    return paginas.filter((p) => p.label.toLowerCase().includes(t) || p.path.toLowerCase().includes(t));
  }, [paginas, q]);

  const elegir = (p: PaginaPlana) => {
    onSelect(`/contenidos/${slug}/${p.path}`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Seleccionar contenido del CMS" wide>
      <div className={styles.body}>
        <div className={styles.controls}>
          <select
            className={styles.select}
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setQ('');
            }}
          >
            <option value="">— Elige una colección —</option>
            {colecciones.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.clave ? `${c.clave} — ${c.nombre}` : c.nombre}
              </option>
            ))}
          </select>
          <input
            className={styles.search}
            type="text"
            placeholder="Buscar página…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={!slug}
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {loading && <p className={styles.hint}>Cargando…</p>}
        {!loading && !slug && <p className={styles.hint}>Elige una colección para ver sus páginas publicadas.</p>}
        {!loading && slug && filtradas.length === 0 && !error && (
          <p className={styles.hint}>No hay páginas publicadas que coincidan.</p>
        )}

        <ul className={styles.list}>
          {filtradas.map((p) => (
            <li key={p.path}>
              <button
                type="button"
                className={styles.item}
                onClick={() => elegir(p)}
                title={`/contenidos/${slug}/${p.path}`}
              >
                <span className="material-icons">description</span>
                <span className={styles.itemLabel}>{p.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
