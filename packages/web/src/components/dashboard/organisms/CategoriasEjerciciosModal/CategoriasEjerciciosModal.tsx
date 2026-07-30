import { useState, useEffect, useCallback } from 'react';
import Modal from '../../atoms/Modal/Modal';
import DashButton from '../../atoms/DashButton/DashButton';
import Icon from '../../atoms/Icon/Icon';
import { useAuth } from '../../../../context/AuthContext';
import { confirmar } from '../../../../utils/dialogos';
import styles from './CategoriasEjerciciosModal.module.css';

interface Categoria { id: string; nombre: string; orden: number; bloqueId: string | null }
interface Bloque { id: string; nombre: string; orden: number }

interface Props {
  isOpen: boolean;
  coleccionId: string;
  onClose: () => void;
}

const API_BASE = '/api';

/**
 * Administra los BLOQUES y las CATEGORÍAS de ejercicios de una colección.
 * Los dos niveles viven en el mismo modal a propósito: asignar una categoría a
 * un bloque es lo que más se hace, y separarlos obligaría a ir y venir.
 */
export default function CategoriasEjerciciosModal({ isOpen, coleccionId, onClose }: Props) {
  const { sessionToken } = useAuth();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [nueva, setNueva] = useState('');
  const [nuevoBloque, setNuevoBloque] = useState('');
  const [error, setError] = useState('');
  const headers = { 'Content-Type': 'application/json', 'x-session-token': sessionToken ?? '' };

  const cargar = useCallback(async () => {
    try {
      const [rc, rb] = await Promise.all([
        fetch(`${API_BASE}/admin/colecciones/${coleccionId}/categorias-ejercicios`, {
          headers: { 'x-session-token': sessionToken ?? '' },
        }),
        fetch(`${API_BASE}/admin/colecciones/${coleccionId}/bloques-ejercicios`, {
          headers: { 'x-session-token': sessionToken ?? '' },
        }),
      ]);
      if (rc.ok) setCategorias((await rc.json()).categorias ?? []);
      if (rb.ok) setBloques((await rb.json()).bloques ?? []);
    } catch { /* ignore */ }
  }, [coleccionId, sessionToken]);

  useEffect(() => { if (isOpen) cargar(); }, [isOpen, cargar]);

  async function agregar() {
    if (!nueva.trim()) return;
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/colecciones/${coleccionId}/categorias-ejercicios`, {
        method: 'POST', headers, body: JSON.stringify({ nombre: nueva.trim(), orden: categorias.length }),
      });
      if (!res.ok) { setError((await res.json().catch(() => ({}))).message || 'Error al crear'); return; }
      setNueva('');
      await cargar();
    } catch { setError('Error al crear'); }
  }

  async function guardarFila(c: Categoria) {
    setError('');
    try {
      // `bloqueId: null` quita el bloque; el API lo trata como "sin bloque".
      await fetch(`${API_BASE}/admin/categorias-ejercicios/${c.id}`, {
        method: 'PUT', headers, body: JSON.stringify({ nombre: c.nombre, orden: c.orden, bloqueId: c.bloqueId }),
      });
    } catch { setError('Error al guardar'); }
  }

  async function agregarBloque() {
    if (!nuevoBloque.trim()) return;
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/colecciones/${coleccionId}/bloques-ejercicios`, {
        method: 'POST', headers, body: JSON.stringify({ nombre: nuevoBloque.trim(), orden: bloques.length }),
      });
      if (!res.ok) { setError((await res.json().catch(() => ({}))).message || 'Error al crear el bloque'); return; }
      setNuevoBloque('');
      await cargar();
    } catch { setError('Error al crear el bloque'); }
  }

  async function guardarBloque(b: Bloque) {
    setError('');
    try {
      await fetch(`${API_BASE}/admin/bloques-ejercicios/${b.id}`, {
        method: 'PUT', headers, body: JSON.stringify({ nombre: b.nombre, orden: b.orden }),
      });
    } catch { setError('Error al guardar el bloque'); }
  }

  async function eliminarBloque(b: Bloque) {
    if (!(await confirmar({
      titulo: `¿Eliminar el bloque "${b.nombre}"?`,
      texto: 'Sus categorías quedan sin bloque (no se borran, ni ellas ni sus ejercicios).',
      confirmar: 'Eliminar',
      peligro: true,
    }))) return;
    try {
      await fetch(`${API_BASE}/admin/bloques-ejercicios/${b.id}`, { method: 'DELETE', headers });
      await cargar();
    } catch { setError('Error al eliminar el bloque'); }
  }

  function editarBloque(id: string, campo: 'nombre' | 'orden', valor: string) {
    setBloques((prev) => prev.map((b) => (b.id === id ? { ...b, [campo]: campo === 'orden' ? Number(valor) || 0 : valor } : b)));
  }

  async function eliminar(c: Categoria) {
    if (!(await confirmar({ titulo: `¿Eliminar la categoría "${c.nombre}"?`, texto: 'Sus ejercicios quedan sin categoría (no se borran).', confirmar: 'Eliminar', peligro: true }))) return;
    try {
      await fetch(`${API_BASE}/admin/categorias-ejercicios/${c.id}`, { method: 'DELETE', headers });
      await cargar();
    } catch { setError('Error al eliminar'); }
  }

  function editar(id: string, campo: 'nombre' | 'orden', valor: string) {
    setCategorias((prev) => prev.map((c) => (c.id === id ? { ...c, [campo]: campo === 'orden' ? Number(valor) || 0 : valor } : c)));
  }

  /** El select guarda al instante: no hay `blur` fiable en un `<select>`. */
  function asignarBloque(c: Categoria, bloqueId: string) {
    const actualizada = { ...c, bloqueId: bloqueId || null };
    setCategorias((prev) => prev.map((x) => (x.id === c.id ? actualizada : x)));
    guardarFila(actualizada);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bloques y categorías de ejercicios">
      {error && <div className={styles.error}>{error}</div>}

      <p className={styles.intro}>
        Los <strong>bloques</strong> son el nivel de arriba (p. ej. “Introducción al lenguaje”,
        “Arquitectura MVVM”) y agrupan categorías. Son opcionales: una categoría sin bloque
        se sigue mostrando, al final de la lista.
      </p>

      <div className={styles.lista}>
        {bloques.length === 0 && <span className={styles.hint}>Aún no hay bloques.</span>}
        {bloques.map((b) => (
          <div key={b.id} className={styles.fila}>
            <input className={styles.orden} type="number" value={b.orden} onChange={(e) => editarBloque(b.id, 'orden', e.target.value)} onBlur={() => guardarBloque(b)} title="Orden" />
            <input className={styles.nombre} value={b.nombre} onChange={(e) => editarBloque(b.id, 'nombre', e.target.value)} onBlur={() => guardarBloque(b)} />
            <button className={styles.borrar} onClick={() => eliminarBloque(b)} title="Eliminar bloque"><Icon name="delete" size="sm" /></button>
          </div>
        ))}
      </div>

      <div className={styles.agregar}>
        <input
          className={styles.nombre}
          value={nuevoBloque}
          onChange={(e) => setNuevoBloque(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') agregarBloque(); }}
          placeholder="Nuevo bloque…"
        />
        <DashButton onClick={agregarBloque} disabled={!nuevoBloque.trim()}>Agregar bloque</DashButton>
      </div>

      <p className={styles.intro}>
        Las <strong>categorías</strong> agrupan los ejercicios por tema. El orden controla cómo
        se muestran <em>dentro</em> de su bloque.
      </p>

      <div className={styles.lista}>
        {categorias.length === 0 && <span className={styles.hint}>Aún no hay categorías.</span>}
        {categorias.map((c) => (
          <div key={c.id} className={styles.fila}>
            <input className={styles.orden} type="number" value={c.orden} onChange={(e) => editar(c.id, 'orden', e.target.value)} onBlur={() => guardarFila(c)} title="Orden" />
            <input className={styles.nombre} value={c.nombre} onChange={(e) => editar(c.id, 'nombre', e.target.value)} onBlur={() => guardarFila(c)} />
            <select
              className={styles.orden}
              value={c.bloqueId ?? ''}
              onChange={(e) => asignarBloque(c, e.target.value)}
              title="Bloque"
              style={{ width: 'auto', minWidth: 140 }}
            >
              <option value="">(sin bloque)</option>
              {bloques.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
            <button className={styles.borrar} onClick={() => eliminar(c)} title="Eliminar"><Icon name="delete" size="sm" /></button>
          </div>
        ))}
      </div>

      <div className={styles.agregar}>
        <input
          className={styles.nombre}
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') agregar(); }}
          placeholder="Nueva categoría…"
        />
        <DashButton onClick={agregar} disabled={!nueva.trim()}>Agregar</DashButton>
      </div>

      <div className={styles.actions}>
        <DashButton variant="outline" onClick={onClose}>Cerrar</DashButton>
      </div>
    </Modal>
  );
}
