import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Icon from '../../atoms/Icon/Icon';
import { useColeccionArbol } from '../../../../context/ColeccionArbolContext';
import { confirmar, pedirTexto, escapar } from '../../../../utils/dialogos';
import { slugify } from '../../../../utils/slug';
import { aplanar, idsDeSubarbol, proyectar, ordenDestino, type NodoPlano } from './arbol-dnd';
import type { DocumentoTipo } from '../../../../types/contenidos';
import styles from './ArbolContenidos.module.css';

const SANGRIA = 14;

const ICONO_TIPO: Record<DocumentoTipo, string> = {
  md: 'article',
  html: 'code',
  categoria: 'folder',
};

interface NodoProps {
  nodo: NodoPlano;
  activo: boolean;
  expandido: boolean;
  profundidadProyectada: number | null;
  editando: boolean;
  onSeleccionar: (id: string) => void;
  onToggle: (id: string) => void;
  onEmpezarRename: (id: string) => void;
  onRenombrar: (id: string, titulo: string) => void;
  onCancelarRename: () => void;
  onCambiarSlug: (nodo: NodoPlano) => void;
  onEliminar: (nodo: NodoPlano) => void;
  onTogglePublicacion: (nodo: NodoPlano) => void;
}

/**
 * ¿El alumno lo ve? Una página, si está publicada. Una carpeta, si no tiene el
 * candado —lo otro que la esconde (no tener páginas publicadas debajo) es
 * derivado y aquí no se puede saber sin mirar el subárbol—.
 */
function esVisible(nodo: NodoPlano): boolean {
  return nodo.esCategoria ? !nodo.oculto : nodo.publicado;
}

function Nodo({
  nodo, activo, expandido, profundidadProyectada, editando,
  onSeleccionar, onToggle, onEmpezarRename, onRenombrar, onCancelarRename,
  onCambiarSlug, onEliminar, onTogglePublicacion,
}: NodoProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: nodo.id,
    // Renombrando no se arrastra: el ratón tiene que poder seleccionar texto.
    disabled: editando,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editando) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editando]);

  const profundidad = profundidadProyectada ?? nodo.profundidad;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        paddingLeft: 6 + profundidad * SANGRIA,
      }}
      className={`${styles.nodo} ${activo ? styles.nodoActivo : ''} ${isDragging ? styles.nodoArrastrando : ''}`}
      onClick={() => !editando && onSeleccionar(nodo.id)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEmpezarRename(nodo.id);
      }}
      title={editando ? undefined : `${nodo.titulo}  ·  /${nodo.slug}`}
      {...attributes}
      {...(editando ? {} : listeners)}
    >
      {nodo.esCategoria ? (
        <button
          type="button"
          className={styles.chevron}
          onClick={(e) => { e.stopPropagation(); onToggle(nodo.id); }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={expandido ? 'Contraer' : 'Expandir'}
        >
          <Icon name={expandido ? 'expand_more' : 'chevron_right'} size="sm" />
        </button>
      ) : (
        <span className={styles.chevronHueco} />
      )}

      <Icon name={ICONO_TIPO[nodo.tipo]} size="sm" />

      {editando ? (
        <input
          ref={inputRef}
          className={styles.renameInput}
          defaultValue={nodo.titulo}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') onRenombrar(nodo.id, (e.target as HTMLInputElement).value);
            if (e.key === 'Escape') onCancelarRename();
          }}
          onBlur={(e) => onRenombrar(nodo.id, e.target.value)}
        />
      ) : (
        <>
          <span className={styles.titulo}>{nodo.titulo}</span>

          <span className={styles.acciones}>
            {/* El interruptor es distinto según el tipo (una carpeta no tiene
                publicación propia: se esconde con un candado sobre su subárbol),
                pero para quien lo usa es el mismo gesto: mostrar / ocultar. */}
            <button
              type="button"
              className={styles.accion}
              title={
                nodo.esCategoria
                  ? (nodo.oculto
                      ? 'Mostrar la carpeta y lo que hay dentro'
                      : 'Ocultar la carpeta completa (con todo lo que cuelga de ella)')
                  : (nodo.publicado
                      ? 'Ocultar a los alumnos (conserva el contenido)'
                      : 'Mostrar a los alumnos')
              }
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onTogglePublicacion(nodo); }}
            >
              <Icon name={esVisible(nodo) ? 'visibility' : 'visibility_off'} size="sm" />
            </button>
            <button
              type="button"
              className={styles.accion}
              title={`Cambiar slug (cambia la URL) — ahora: /${nodo.slug}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onCambiarSlug(nodo); }}
            >
              <Icon name="link" size="sm" />
            </button>
            <button
              type="button"
              className={`${styles.accion} ${styles.accionPeligro}`}
              title="Eliminar"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onEliminar(nodo); }}
            >
              <Icon name="delete" size="sm" />
            </button>
          </span>

          {!nodo.esCategoria && (
            <span
              // Publicada pero con una carpeta candada encima: el alumno NO la ve.
              // El punto dice lo que el alumno ve, no lo que el flag dice.
              className={nodo.publicado && !nodo.ancestroOculto ? styles.dotPub : styles.dotBorr}
              // "Oculta", no "Borrador": el borrador es OTRA cosa (los cambios
              // sin publicar de una versión). Confundirlos aquí sería fatal.
              title={
                !nodo.publicado
                  ? 'Oculta — no la ven los alumnos'
                  : nodo.ancestroOculto
                    ? 'Publicada, pero su carpeta está oculta: los alumnos no la ven'
                    : 'Publicada — la ven los alumnos'
              }
            />
          )}

          {/* A una carpeta solo se le pinta el punto cuando está candada. Un punto
              verde prometería que se ve, y una carpeta sin páginas publicadas no se
              ve aunque no tenga candado. */}
          {nodo.esCategoria && nodo.oculto && (
            <span
              className={styles.dotBorr}
              title="Carpeta oculta — no la ven los alumnos, ni nada de lo que hay dentro"
            />
          )}
        </>
      )}
    </div>
  );
}

/**
 * Árbol de páginas de la colección, en el sidebar.
 *
 * - La selección vive en la URL (`?doc=<id>`): recargar o compartir el enlace
 *   devuelve la misma página abierta.
 * - Doble clic = renombrar (solo el título; el slug NO se toca, porque es la URL
 *   pública y hay enlaces internos apuntando a ella).
 * - Arrastrar = mover: en vertical reordena, en horizontal cambia de nivel. Solo
 *   se puede colgar de una categoría.
 */
export default function ArbolContenidos({ coleccionId }: { coleccionId: string }) {
  const {
    arbol, documentos, coleccion, cargando,
    mover, renombrar, cambiarSlug, eliminar, cambiarPublicacion,
  } = useColeccionArbol();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const seleccionadoId = searchParams.get('doc');

  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [overId, setOverId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Arrastrar debe poder empezar sin bloquear el clic simple ni el doble clic.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Al entrar por enlace directo, abrir las categorías que llevan a la página:
  // si no, el nodo seleccionado quedaría escondido en una rama cerrada.
  useEffect(() => {
    if (!seleccionadoId || documentos.length === 0) return;
    const porId = new Map(documentos.map((d) => [d.id, d]));
    const ancestros = new Set<string>();
    let actual = porId.get(seleccionadoId);
    while (actual?.padreId) {
      ancestros.add(actual.padreId);
      actual = porId.get(actual.padreId);
    }
    if (ancestros.size > 0) setExpandidos((prev) => new Set([...prev, ...ancestros]));
  }, [seleccionadoId, documentos]);

  const planos = useMemo(() => aplanar(arbol, expandidos), [arbol, expandidos]);

  // Mientras arrastras, la descendencia del nodo desaparece de la lista: no
  // tiene sentido soltar una categoría dentro de sí misma.
  const visibles = useMemo(() => {
    if (!activeId) return planos;
    const excluir = idsDeSubarbol(planos, activeId);
    excluir.delete(activeId);
    return planos.filter((n) => !excluir.has(n.id));
  }, [planos, activeId]);

  const proyeccion = useMemo(() => {
    if (!activeId || !overId) return null;
    return proyectar(visibles, activeId, overId, offsetX, SANGRIA);
  }, [visibles, activeId, overId, offsetX]);

  function toggle(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function seleccionar(id: string) {
    navigate(`/admin/contenidos/${coleccionId}?doc=${id}`);
  }

  async function handleRenombrar(id: string, titulo: string) {
    setEditandoId(null);
    const limpio = titulo.trim();
    const original = documentos.find((d) => d.id === id)?.titulo;
    if (!limpio || limpio === original) return;
    const err = await renombrar(id, limpio);
    if (err) setError(err);
  }

  /** Ruta pública de los ANCESTROS del nodo (sin su propio slug ni el dominio). */
  function rutaAncestros(nodoId: string): string {
    const porId = new Map(documentos.map((d) => [d.id, d]));
    const segmentos: string[] = [];
    let actual = porId.get(nodoId);
    while (actual?.padreId) {
      const padre = porId.get(actual.padreId);
      if (!padre) break;
      segmentos.unshift(padre.slug);
      actual = padre;
    }
    return `/contenidos/${coleccion?.slug ?? '…'}${segmentos.length ? '/' + segmentos.join('/') : ''}`;
  }

  async function handleCambiarSlug(nodo: NodoPlano) {
    const base = rutaAncestros(nodo.id);
    // slugify ya deja solo [a-z0-9-]; se escapa igual, por si el día de mañana
    // se relaja la normalización.
    const seg = (s: string) => `<span class="swal-seg">${escapar(s)}</span>`;
    const cola = nodo.esCategoria && nodo.tieneHijos ? '<span class="swal-ruta-cola">/…</span>' : '';

    const nuevo = await pedirTexto({
      titulo: 'Cambiar slug',
      html:
        `Slug de <b>${escapar(nodo.titulo)}</b> — el segmento de la URL pública.` +
        '<span class="swal-aviso">⚠️ Cambia la URL de esta página' +
        (nodo.esCategoria && nodo.tieneHijos ? ' <b>y la de todo lo que cuelga de ella</b>' : '') +
        '. Los enlaces que ya apunten a la ruta actual dejarán de funcionar: no hay redirects.</span>',
      valor: nodo.slug,
      confirmar: 'Cambiar la URL',
      normalizar: slugify,
      validar: (v) => (v ? null : 'El slug no puede quedar vacío'),
      vistaPrevia: (v) => {
        const antes =
          `<div class="swal-ruta"><span class="swal-ruta-label">Ahora</span>` +
          `<code>${escapar(base)}/${seg(nodo.slug)}${cola}</code></div>`;
        if (!v) {
          return antes;
        }
        if (v === nodo.slug) {
          return antes + '<div class="swal-ruta-nota">Sin cambios.</div>';
        }
        const despues =
          `<div class="swal-ruta swal-ruta-nueva"><span class="swal-ruta-label">Quedará</span>` +
          `<code>${escapar(base)}/${seg(v)}${cola}</code></div>`;
        return antes + despues;
      },
    });
    if (nuevo === null || nuevo === nodo.slug) return;
    const err = await cambiarSlug(nodo.id, nuevo);
    if (err) setError(err);
  }

  /**
   * Mostrar/ocultar a los alumnos. Solo se confirma al OCULTAR: es la dirección
   * que le quita algo a alguien que quizá ya lo tenía abierto.
   */
  async function handleTogglePublicacion(nodo: NodoPlano) {
    const visible = esVisible(nodo);
    if (visible) {
      const ok = await confirmar({
        titulo: nodo.esCategoria ? `¿Ocultar la carpeta «${nodo.titulo}»?` : `¿Ocultar «${nodo.titulo}»?`,
        texto: nodo.esCategoria
          // Se dice explícitamente que arrastra el contenido: es lo único de esta
          // acción que no se ve en pantalla al pulsarla.
          ? 'Dejarán de aparecer para los alumnos la carpeta Y TODO lo que hay dentro, '
            + 'incluidas sus páginas publicadas. No se despublica nada: al volver a '
            + 'mostrarla, cada página regresa al estado en el que estaba.'
          : 'Dejará de aparecer en el árbol de los alumnos. El contenido se conserva: '
            + 'puedes volver a mostrarla cuando quieras y quedará igual.',
        confirmar: 'Ocultar',
      });
      if (!ok) return;
    }
    const err = await cambiarPublicacion(nodo.id, !visible);
    if (err) setError(err);
  }

  async function handleEliminar(nodo: NodoPlano) {
    if (nodo.tieneHijos) {
      setError(`"${nodo.titulo}" tiene páginas dentro. Muévelas o elimínalas primero.`);
      return;
    }
    const ok = await confirmar({
      titulo: `¿Eliminar «${nodo.titulo}»?`,
      texto: 'Esta acción no se puede deshacer.',
      confirmar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    const err = await eliminar(nodo.id);
    if (err) {
      setError(err);
      return;
    }
    if (seleccionadoId === nodo.id) navigate(`/admin/contenidos/${coleccionId}`);
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    setOverId(String(e.active.id));
    setError('');
  }

  function onDragMove(e: DragMoveEvent) {
    setOffsetX(e.delta.x);
    if (e.over) setOverId(String(e.over.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    const active = activeId;
    const proj = proyeccion;
    setActiveId(null);
    setOverId(null);
    setOffsetX(0);
    if (!active || !e.over || !proj) return;

    const nodo = planos.find((n) => n.id === active);
    if (!nodo) return;

    const orden = ordenDestino(visibles, active, String(e.over.id), proj.padreId);
    // Sin cambios reales: no molestamos al servidor.
    if ((nodo.padreId ?? null) === proj.padreId && String(e.over.id) === active) return;

    const err = await mover(active, proj.padreId, orden);
    if (err) {
      // El servidor rechaza mover a una categoría donde ya hay un hermano con el
      // mismo slug — y aquí abundan los `readme`, así que pasará. El árbol se
      // repinta solo desde el refetch; basta con explicar por qué no se movió.
      setError(err);
      return;
    }
    if (proj.padreId) setExpandidos((prev) => new Set(prev).add(proj.padreId!));
  }

  const nodoArrastrado = activeId ? planos.find((n) => n.id === activeId) : null;

  if (cargando && documentos.length === 0) {
    return <p className={styles.vacio}>Cargando árbol…</p>;
  }
  if (documentos.length === 0) {
    return <p className={styles.vacio}>Esta colección no tiene páginas todavía.</p>;
  }

  return (
    <div className={styles.wrap}>
      {error && (
        <div className={styles.error} onClick={() => setError('')} title="Descartar">
          {error}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onDragCancel={() => { setActiveId(null); setOverId(null); setOffsetX(0); }}
      >
        <SortableContext items={visibles.map((n) => n.id)} strategy={verticalListSortingStrategy}>
          <div className={styles.arbol}>
            {visibles.map((n) => (
              <Nodo
                key={n.id}
                nodo={n}
                activo={n.id === seleccionadoId}
                expandido={expandidos.has(n.id)}
                profundidadProyectada={activeId === n.id && proyeccion ? proyeccion.profundidad : null}
                editando={editandoId === n.id}
                onSeleccionar={seleccionar}
                onToggle={toggle}
                onEmpezarRename={setEditandoId}
                onRenombrar={handleRenombrar}
                onCancelarRename={() => setEditandoId(null)}
                onCambiarSlug={handleCambiarSlug}
                onEliminar={handleEliminar}
                onTogglePublicacion={handleTogglePublicacion}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {nodoArrastrado && (
            <div className={styles.overlay}>
              <Icon name={ICONO_TIPO[nodoArrastrado.tipo]} size="sm" />
              <span>{nodoArrastrado.titulo}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
