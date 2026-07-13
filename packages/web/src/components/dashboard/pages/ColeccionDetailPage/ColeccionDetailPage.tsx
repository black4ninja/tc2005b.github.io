import { useState, useMemo, Suspense, lazy } from 'react';
import { useParams, useSearchParams, Link } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import { useColeccionArbol } from '../../../../context/ColeccionArbolContext';
import Modal from '../../atoms/Modal/Modal';
import Icon from '../../atoms/Icon/Icon';
import DashButton from '../../atoms/DashButton/DashButton';
import DocumentoForm, { aplanarCategorias, type DocumentoSavePayload } from '../../organisms/DocumentoForm/DocumentoForm';
import styles from './ColeccionDetailPage.module.css';

// CodeMirror + el pipeline de render pesan: solo se cargan cuando hay una página
// seleccionada (al mirar una categoría no se descarga nada).
const EditorContenido = lazy(() => import('../EditorContenidoPage/EditorContenidoPage'));

const API_BASE = '/api';

/**
 * Admin del CMS "Contenidos": el editor de la página seleccionada.
 *
 * Aquí ya no hay panel de metadatos. Todo lo que había se movió a donde se usa:
 * el título se renombra con doble clic en el árbol, el orden y el padre se
 * cambian arrastrando, el slug y el borrado son acciones del nodo, y la
 * plantilla vive en la toolbar del editor. El árbol lo pinta el sidebar
 * (ArbolContenidos) y comparte datos con esta página vía ColeccionArbolContext.
 *
 * La selección viaja en la URL (`?doc=<id>`).
 */
export default function ColeccionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { sessionToken } = useAuth();
  const { coleccion, documentos, arbol, cargando, refetch } = useColeccionArbol();

  const seleccionadoId = searchParams.get('doc');

  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);

  const categorias = useMemo(() => aplanarCategorias(arbol), [arbol]);
  const seleccionado = useMemo(
    () => documentos.find((d) => d.id === seleccionadoId) ?? null,
    [documentos, seleccionadoId],
  );

  async function handleCrear(data: DocumentoSavePayload) {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/colecciones/${id}/documentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken ?? '' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // Dentro del modal: un error en la página quedaría oculto tras el overlay.
        setModalError(err.message || 'Error al crear');
        return;
      }
      setModalError('');
      setModalOpen(false);
      await refetch();
    } catch (err: any) {
      setModalError(err.message || 'Error al crear');
    } finally {
      setSaving(false);
    }
  }

  if (cargando && documentos.length === 0) {
    return <div className={styles.page}><p>Cargando...</p></div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link to="/admin/contenidos" className={styles.volver}>
          <Icon name="arrow_back" size="sm" />
          <span>Contenidos</span>
        </Link>
        <h1 className={styles.pageTitle}>
          {coleccion ? `${coleccion.clave ? `${coleccion.clave} — ` : ''}${coleccion.nombre}` : id}
        </h1>
        <div className={styles.headerActions}>
          <DashButton onClick={() => { setModalError(''); setModalOpen(true); }}>+ Página / Categoría</DashButton>
        </div>
      </div>

      {error && <div className={styles.error} onClick={() => setError('')}>{error}</div>}

      {!seleccionado ? (
        <div className={styles.vacio}>
          <Icon name="menu_book" size="lg" />
          <p>Selecciona una página en el árbol para editarla.</p>
          <p className={styles.hint}>
            {documentos.length === 0
              ? 'Esta colección aún no tiene páginas. Crea la primera con "+ Página / Categoría".'
              : 'Doble clic para renombrar · arrastra para mover o cambiar de nivel.'}
          </p>
        </div>
      ) : seleccionado.tipo === 'categoria' ? (
        <div className={styles.vacio}>
          <Icon name="folder" size="lg" />
          <p>«{seleccionado.titulo}» es una categoría: solo agrupa páginas, no tiene contenido.</p>
          <p className={styles.hint}>Doble clic en el árbol para renombrarla · arrástrala para moverla.</p>
        </div>
      ) : (
        <div className={styles.editorWrap}>
          <Suspense fallback={<p className={styles.hint}>Cargando editor…</p>}>
            {/* key: al cambiar de página se remonta el editor. Sin esto, su estado
                interno (cuerpo, historial de deshacer) se arrastraría de un
                documento al siguiente. El desmontaje vacía el autosave pendiente. */}
            <EditorContenido
              key={seleccionado.id}
              coleccionId={id}
              docId={seleccionado.id}
              embebido
            />
          </Suspense>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setModalError(''); }} title="Nueva página o categoría">
        <DocumentoForm
          categorias={categorias}
          padreInicial={seleccionado?.tipo === 'categoria' ? seleccionado.id : undefined}
          errorExterno={modalError}
          onSave={handleCrear}
          onCancel={() => { setModalOpen(false); setModalError(''); }}
          loading={saving}
        />
      </Modal>
    </div>
  );
}
