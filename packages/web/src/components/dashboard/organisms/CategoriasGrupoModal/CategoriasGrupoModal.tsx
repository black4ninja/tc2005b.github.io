import { useEffect, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import CategoriaOrdenable from './CategoriaOrdenable';
import Modal from '../../atoms/Modal/Modal';
import TextInput from '../../atoms/TextInput/TextInput';
import DashButton from '../../atoms/DashButton/DashButton';
import { confirmar } from '../../../../utils/dialogos';
import type { CategoriaRef } from '../../atoms/NombreGrupo/NombreGrupo';
import styles from './CategoriasGrupoModal.module.css';

interface CategoriasGrupoModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionToken: string;
  categorias: CategoriaRef[];
  /** Se llama tras cada alta, edición o borrado para recargar arriba. */
  onCambio: () => Promise<void> | void;
}

/**
 * Alta, edición y borrado del catálogo de categorías de grupo.
 *
 * La paleta la manda el servidor junto al listado, para que las dos puntas no
 * tengan cada una su copia de los hex y acaben discrepando. Igualmente se deja
 * escribir un color a mano: el catálogo es del usuario, no una lista cerrada.
 */
export default function CategoriasGrupoModal({
  isOpen,
  onClose,
  sessionToken,
  categorias,
  onCambio,
}: CategoriasGrupoModalProps) {
  const [paleta, setPaleta] = useState<string[]>([]);
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState('');
  const [editandoId, setEditandoId] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  /**
   * Copia local del orden. La lista se pinta desde AQUÍ y no desde la prop:
   * al soltar hay que recolocar la fila en el acto, sin esperar al viaje al
   * servidor, o el elemento vuelve a su sitio y parece que el arrastre falló.
   */
  const [orden, setOrden] = useState<CategoriaRef[]>(categorias);

  // La prop manda cuando cambia de verdad (alta, edición, borrado o recarga
  // tras reordenar). Sin esto, la copia local se quedaría congelada.
  useEffect(() => {
    setOrden(categorias);
  }, [categorias]);

  const sensores = useSensors(
    // Con 10 px de holgura, un clic en el asa sigue siendo un clic y no
    // arranca un arrastre de un pixel.
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    // Reordenar solo con el ratón deja fuera a quien navega con teclado.
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const headers = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken,
  };

  // La paleta se pide al abrir, no al montar: el modal vive montado en la página
  // y pedirla en cada render de la tabla sería una consulta por nada.
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/admin/categorias-grupo', { headers: { 'x-session-token': sessionToken } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.paleta && setPaleta(d.paleta))
      .catch(() => {
        // Sin paleta el campo de texto sigue sirviendo; no es bloqueante.
      });
  }, [isOpen, sessionToken]);

  // Al cerrar se limpia el formulario: si no, reabrirlo enseña a medio escribir
  // la categoría que se abandonó, o peor, sigue en modo edición de otra.
  useEffect(() => {
    if (isOpen) return;
    limpiar();
  }, [isOpen]);

  function limpiar() {
    setNombre('');
    setColor('');
    setEditandoId('');
    setError('');
  }

  function editar(categoria: CategoriaRef) {
    setEditandoId(categoria.id);
    setNombre(categoria.nombre);
    setColor(categoria.color);
    setError('');
  }

  async function guardar() {
    const limpio = nombre.trim();
    if (!limpio) {
      setError('El nombre es requerido');
      return;
    }
    // Sin color elegido se toma el primero libre de la paleta, para no obligar a
    // decidirlo: lo importante es que dos categorías no salgan del mismo tono.
    const elegido = color || sugerirColor();

    setGuardando(true);
    setError('');
    try {
      const res = await fetch(
        editandoId ? `/api/admin/categorias-grupo/${editandoId}` : '/api/admin/categorias-grupo',
        {
          method: editandoId ? 'PUT' : 'POST',
          headers,
          body: JSON.stringify({ nombre: limpio, color: elegido }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Error al guardar la categoría');
      limpiar();
      await onCambio();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  /**
   * Fija el orden nuevo en pantalla y lo manda al servidor.
   *
   * Se pinta ANTES de que responda: esperar al viaje deja la fila volviendo a su
   * sitio medio segundo, que se lee como que el arrastre no funcionó. Si la
   * petición falla se deshace y se dice por qué, en vez de dejar la pantalla
   * enseñando un orden que no está guardado.
   */
  async function alSoltar(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over || active.id === over.id) return;

    const desde = orden.findIndex((c) => c.id === active.id);
    const hasta = orden.findIndex((c) => c.id === over.id);
    if (desde === -1 || hasta === -1) return;

    const anterior = orden;
    const nuevo = arrayMove(orden, desde, hasta);
    setOrden(nuevo);
    setError('');

    try {
      const res = await fetch('/api/admin/categorias-grupo/orden', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ ids: nuevo.map((c) => c.id) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Error al guardar el orden');
      await onCambio();
    } catch (err: any) {
      setOrden(anterior);
      setError(err.message);
    }
  }

  async function borrar(categoria: CategoriaRef) {
    if (
      !(await confirmar({
        titulo: `¿Eliminar la categoría "${categoria.nombre}"?`,
        confirmar: 'Eliminar',
        peligro: true,
      }))
    ) {
      return;
    }
    setError('');
    try {
      const res = await fetch(`/api/admin/categorias-grupo/${categoria.id}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json().catch(() => ({}));
      // El 409 trae la lista de grupos que la usan: se enseña tal cual, que es
      // justo lo que hay que arreglar antes de poder borrarla.
      if (!res.ok) throw new Error(data.message || 'Error al eliminar la categoría');
      if (editandoId === categoria.id) limpiar();
      await onCambio();
    } catch (err: any) {
      setError(err.message);
    }
  }

  /** Primer color de la paleta que no esté ya en uso; si todos lo están, el primero. */
  function sugerirColor(): string {
    const usados = new Set(orden.map((c) => c.color));
    return paleta.find((c) => !usados.has(c)) ?? paleta[0] ?? '#64748b';
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Categorías de grupo">
      <div className={styles.contenido}>
        <p className={styles.ayuda}>
          La categoría es la materia o el nivel ("Móviles", "Gráficas", "IA", "6to"). Su color es el
          que llevan sus grupos en las listas y en el selector.
        </p>

        {error && <div className={styles.error}>{error}</div>}

        {orden.length === 0 ? (
          <p className={styles.vacio}>Todavía no hay categorías.</p>
        ) : (
          <>
            <p className={styles.ayudaOrden}>
              Arrastra para cambiar el orden en que aparecen. También puedes mover una con el
              teclado: enfoca su asa, pulsa espacio y usa las flechas.
            </p>
            <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar}>
              <SortableContext items={orden.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <ul className={styles.lista}>
                  {orden.map((categoria) => (
                    <CategoriaOrdenable key={categoria.id} id={categoria.id}>
                      {({ listeners, attributes }) => (
                        <li className={styles.fila}>
                          <button
                            type="button"
                            className={styles.asa}
                            aria-label={`Reordenar ${categoria.nombre}`}
                            {...attributes}
                            {...listeners}
                          >
                            <span className="material-icons" aria-hidden="true">drag_indicator</span>
                          </button>
                          <span
                            className={styles.punto}
                            style={{ background: categoria.color }}
                            aria-hidden="true"
                          />
                          <span className={styles.nombre}>{categoria.nombre}</span>
                          <button
                            type="button"
                            className={styles.accion}
                            onClick={() => editar(categoria)}
                            aria-label={`Editar ${categoria.nombre}`}
                          >
                            <span className="material-icons" aria-hidden="true">edit</span>
                          </button>
                          <button
                            type="button"
                            className={`${styles.accion} ${styles.accionPeligro}`}
                            onClick={() => borrar(categoria)}
                            aria-label={`Eliminar ${categoria.nombre}`}
                          >
                            <span className="material-icons" aria-hidden="true">delete</span>
                          </button>
                        </li>
                      )}
                    </CategoriaOrdenable>
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </>
        )}

        <div className={styles.formulario}>
          <TextInput
            label={editandoId ? 'Editando categoría' : 'Nueva categoría'}
            placeholder="Móviles, Gráficas, IA, 6to…"
            value={nombre}
            onChange={setNombre}
          />

          <div className={styles.paleta} role="group" aria-label="Color de la categoría">
            {paleta.map((c) => (
              <button
                key={c}
                type="button"
                className={`${styles.muestra} ${color === c ? styles.muestraActiva : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                aria-pressed={color === c}
              />
            ))}
          </div>

          <div className={styles.acciones}>
            {editandoId && (
              <DashButton variant="outline" onClick={limpiar} disabled={guardando}>
                Cancelar edición
              </DashButton>
            )}
            <DashButton onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : editandoId ? 'Guardar cambios' : 'Agregar categoría'}
            </DashButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}
