import { useEffect, useState } from 'react';
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
    const usados = new Set(categorias.map((c) => c.color));
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

        <ul className={styles.lista}>
          {categorias.length === 0 && (
            <li className={styles.vacio}>Todavía no hay categorías.</li>
          )}
          {categorias.map((categoria) => (
            <li key={categoria.id} className={styles.fila}>
              <span className={styles.punto} style={{ background: categoria.color }} aria-hidden="true" />
              <span className={styles.nombre}>{categoria.nombre}</span>
              <button
                type="button"
                className={styles.accion}
                onClick={() => editar(categoria)}
                aria-label={`Editar ${categoria.nombre}`}
              >
                <span className="material-icons">edit</span>
              </button>
              <button
                type="button"
                className={`${styles.accion} ${styles.accionPeligro}`}
                onClick={() => borrar(categoria)}
                aria-label={`Eliminar ${categoria.nombre}`}
              >
                <span className="material-icons">delete</span>
              </button>
            </li>
          ))}
        </ul>

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
