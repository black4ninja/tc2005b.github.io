import { useState, useEffect, useCallback, useMemo } from 'react';
import { confirmar } from '../../../../utils/dialogos';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import Icon from '../../atoms/Icon/Icon';
import Modal from '../../atoms/Modal/Modal';
import ColeccionForm from '../../organisms/ColeccionForm/ColeccionForm';
import { buscarColecciones } from '../../../../utils/buscarColecciones';
import type { ColeccionData } from '../../../../types/contenidos';
import styles from './ContenidosPage.module.css';

const API_BASE = '/api';

/**
 * Los MÓDULOS de una colección: sitios a los que se entra dentro de la materia.
 *
 * Van aparte de editar y borrar a propósito. Antes las nueve acciones eran una
 * fila de iconos mudos y con el mismo peso, así que «eliminar» se veía igual que
 * «entrar a Preguntas» y no había forma de saber cuál era cuál sin pasar el
 * ratón por encima uno a uno.
 *
 * El color agrupa por familia —contenido, evaluación, práctica— para orientar
 * antes de leer.
 */
const MODULOS: { key: string; label: string; icon: string; familia: string; ruta: (id: string) => string }[] = [
  { key: 'wiki', label: 'Wiki', icon: 'account_tree', familia: 'contenido', ruta: (id) => `/admin/contenidos/${id}` },
  { key: 'paginas', label: 'Páginas', icon: 'article', familia: 'contenido', ruta: (id) => `/admin/paginas?coleccion=${id}` },
  { key: 'competencias', label: 'Competencias', icon: 'emoji_events', familia: 'evaluacion', ruta: (id) => `/admin/competencias?coleccion=${id}` },
  { key: 'actividades', label: 'Actividades', icon: 'assignment', familia: 'evaluacion', ruta: (id) => `/admin/actividades?coleccion=${id}` },
  { key: 'ejercicios', label: 'Ejercicios', icon: 'terminal', familia: 'practica', ruta: (id) => `/admin/contenidos/${id}/ejercicios` },
  { key: 'diagramas', label: 'Diagramas', icon: 'schema', familia: 'practica', ruta: (id) => `/admin/contenidos/${id}/diagramas` },
  { key: 'preguntas', label: 'Preguntas', icon: 'quiz', familia: 'practica', ruta: (id) => `/admin/contenidos/${id}/preguntas` },
];

/** Admin del CMS "Contenidos": las colecciones y sus módulos (design §5.1). */
export default function ContenidosPage() {
  const { sessionToken } = useAuth();
  const navigate = useNavigate();
  const [colecciones, setColecciones] = useState<ColeccionData[]>([]);
  const [consulta, setConsulta] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editColeccion, setEditColeccion] = useState<ColeccionData | undefined>();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  };

  const fetchColecciones = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/colecciones`, { headers: { 'x-session-token': sessionToken ?? '' } });
      if (!res.ok) throw new Error('Error al cargar colecciones');
      const data = await res.json();
      setColecciones(data.colecciones);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    fetchColecciones();
  }, [fetchColecciones]);

  const visibles = useMemo(
    () => buscarColecciones(colecciones, consulta),
    [colecciones, consulta],
  );

  function openCreate() {
    setEditColeccion(undefined);
    setError('');
    setModalOpen(true);
  }

  function openEdit(coleccion: ColeccionData) {
    setEditColeccion(coleccion);
    setError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditColeccion(undefined);
    setError('');
  }

  async function handleSave(data: { nombre: string; slug: string; clave?: string; descripcion?: string; publicada?: boolean }) {
    setSaving(true);
    setError('');
    try {
      const url = editColeccion
        ? `${API_BASE}/admin/colecciones/${editColeccion.id}`
        : `${API_BASE}/admin/colecciones`;
      const method = editColeccion ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers, body: JSON.stringify(data) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al guardar');
      }
      closeModal();
      await fetchColecciones();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(coleccion: ColeccionData) {
    if (!(await confirmar({ titulo: `¿Eliminar la colección "${coleccion.nombre}"?`, texto: `Sus páginas dejarán de ser accesibles.`, confirmar: 'Eliminar', peligro: true }))) return;
    try {
      const res = await fetch(`${API_BASE}/admin/colecciones/${coleccion.id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Error al eliminar');
      await fetchColecciones();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Contenidos</h1>
        {/* Páginas y Competencias salieron del menú lateral: sin estas salidas
            solo se llegaría a listas YA filtradas por colección, y se perderían
            tres cosas.
              · La vista de conjunto (filtro por etiqueta cruzando colecciones).
              · Las páginas/competencias SIN colección, que quedarían inalcanzables.
              · Las "Indicaciones para Malla", que son GLOBALES (no tienen
                colección) y por eso solo se muestran en la vista sin filtrar. */}
        <div className={styles.headerLinks}>
          <Link to="/admin/paginas" className={styles.verTodas}>
            <Icon name="article" size="sm" />
            <span>Ver todas las páginas</span>
          </Link>
          <Link to="/admin/competencias" className={styles.verTodas}>
            <Icon name="emoji_events" size="sm" />
            <span>Ver todas las competencias</span>
          </Link>
          <Link to="/admin/actividades" className={styles.verTodas}>
            <Icon name="assignment" size="sm" />
            <span>Ver todas las actividades</span>
          </Link>
        </div>
      </div>

      <div className={styles.barra}>
        <div className={styles.buscadorWrap}>
          <Icon name="search" size="sm" className={styles.buscadorIcono} />
          <input
            className={styles.buscador}
            type="search"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Buscar por clave, nombre o slug..."
            aria-label="Buscar colección"
          />
        </div>
        <span className={styles.recuento}>
          {consulta.trim()
            ? `${visibles.length} de ${colecciones.length} materias`
            : `${colecciones.length} materia${colecciones.length === 1 ? '' : 's'}`}
        </span>
        <button className={styles.nueva} onClick={openCreate}>
          <Icon name="add" size="sm" />
          <span>Nueva Colección</span>
        </button>
      </div>

      {error && !modalOpen && <div className={styles.error} onClick={() => setError('')}>{error}</div>}

      {loading ? (
        <p className={styles.info}>Cargando...</p>
      ) : visibles.length === 0 ? (
        <div className={styles.vacio}>
          <Icon name={consulta.trim() ? 'search_off' : 'library_books'} size="lg" />
          <p>
            {consulta.trim()
              ? `Ninguna materia coincide con «${consulta.trim()}».`
              : 'No hay colecciones registradas.'}
          </p>
        </div>
      ) : (
        <div className={styles.rejilla}>
          {visibles.map((coleccion) => (
            <article key={coleccion.id} className={styles.tarjeta}>
              <div className={styles.tarjetaCabecera}>
                <span className={styles.clave}>{coleccion.clave || '—'}</span>
                <span className={`${styles.badge} ${coleccion.publicada ? styles.badgeActive : styles.badgeDraft}`}>
                  {coleccion.publicada ? 'Publicada' : 'Borrador'}
                </span>
                {/* Editar y eliminar NO son módulos: no se entra a ellos, se le
                    hacen a la colección. De ahí que vayan aparte y apagados. */}
                <span className={styles.tarjetaAcciones}>
                  <button
                    className={styles.iconBtn}
                    onClick={() => openEdit(coleccion)}
                    title="Editar la colección"
                    aria-label={`Editar ${coleccion.nombre}`}
                  >
                    <Icon name="edit" size="sm" />
                  </button>
                  <button
                    className={`${styles.iconBtn} ${styles.iconBtnPeligro}`}
                    onClick={() => handleDelete(coleccion)}
                    title="Eliminar la colección"
                    aria-label={`Eliminar ${coleccion.nombre}`}
                  >
                    <Icon name="delete" size="sm" />
                  </button>
                </span>
              </div>

              <p className={styles.nombre}>{coleccion.nombre}</p>
              <code className={styles.slug}>{coleccion.slug}</code>

              <div className={styles.modulos}>
                {MODULOS.map((m) => (
                  <button
                    key={m.key}
                    className={`${styles.modulo} ${styles[m.familia]}`}
                    onClick={() => navigate(m.ruta(coleccion.id))}
                    aria-label={`${m.label} de ${coleccion.nombre}`}
                  >
                    <Icon name={m.icon} size="sm" className={styles.moduloIcono} />
                    <span className={styles.moduloLabel}>{m.label}</span>
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editColeccion ? 'Editar Colección' : 'Nueva Colección'}>
        <ColeccionForm
          coleccion={editColeccion}
          errorExterno={error}
          onSave={handleSave}
          onCancel={closeModal}
          loading={saving}
        />
      </Modal>
    </div>
  );
}
