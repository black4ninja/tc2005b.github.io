import { useState, useEffect, useCallback } from 'react';
import Modal from '../../atoms/Modal/Modal';
import DashButton from '../../atoms/DashButton/DashButton';
import Icon from '../../atoms/Icon/Icon';
import { useAuth } from '../../../../context/AuthContext';
import { confirmar } from '../../../../utils/dialogos';
import styles from './CategoriasEjerciciosModal.module.css';

interface Categoria { id: string; nombre: string; orden: number }

interface Props {
  isOpen: boolean;
  coleccionId: string;
  onClose: () => void;
}

const API_BASE = '/api';

/** Administra las categorías de ejercicios de una colección (crear/renombrar/orden/borrar). */
export default function CategoriasEjerciciosModal({ isOpen, coleccionId, onClose }: Props) {
  const { sessionToken } = useAuth();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nueva, setNueva] = useState('');
  const [error, setError] = useState('');
  const headers = { 'Content-Type': 'application/json', 'x-session-token': sessionToken ?? '' };

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/colecciones/${coleccionId}/categorias-ejercicios`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) return;
      const j = await res.json();
      setCategorias(j.categorias ?? []);
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
      await fetch(`${API_BASE}/admin/categorias-ejercicios/${c.id}`, {
        method: 'PUT', headers, body: JSON.stringify({ nombre: c.nombre, orden: c.orden }),
      });
    } catch { setError('Error al guardar'); }
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Categorías de ejercicios">
      {error && <div className={styles.error}>{error}</div>}
      <p className={styles.intro}>Agrupan los ejercicios por tema (p. ej. “Sintaxis básica”, “POO”, “SOLID”). El orden controla cómo se muestran.</p>

      <div className={styles.lista}>
        {categorias.length === 0 && <span className={styles.hint}>Aún no hay categorías.</span>}
        {categorias.map((c) => (
          <div key={c.id} className={styles.fila}>
            <input className={styles.orden} type="number" value={c.orden} onChange={(e) => editar(c.id, 'orden', e.target.value)} onBlur={() => guardarFila(c)} title="Orden" />
            <input className={styles.nombre} value={c.nombre} onChange={(e) => editar(c.id, 'nombre', e.target.value)} onBlur={() => guardarFila(c)} />
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
