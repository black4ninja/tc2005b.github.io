import { useState, useEffect, useCallback, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { confirmar, avisar } from '../../../../utils/dialogos';
import { useAuth } from '../../../../context/AuthContext';
import AdminTable from '../../organisms/AdminTable/AdminTable';
import type { ActionItem } from '../../organisms/AdminTable/AdminTable';
import Modal from '../../atoms/Modal/Modal';
import DashButton from '../../atoms/DashButton/DashButton';
import Icon from '../../atoms/Icon/Icon';
import EscenarioProyector from '../../organisms/EscenarioProyector/EscenarioProyector';
import { formatearDuracion, parsearEtiquetas } from '../../../../utils/escenarios';
import type { EscenarioPregunta } from '../../../../types/escenarios';
import styles from './EscenariosBancoPage.module.css';

const API_BASE = '/api';

function mensajeDeError(e: unknown, porDefecto: string): string {
  return e instanceof Error && e.message ? e.message : porDefecto;
}

interface Borrador {
  titulo: string;
  texto: string;
  etiquetas: string;
  duracionSegundos: string;
  notas: string;
}

const VACIO: Borrador = { titulo: '', texto: '', etiquetas: '', duracionSegundos: '180', notas: '' };

/**
 * Banco de ESCENARIOS: las preguntas que el profesor plantea en las entrevistas
 * personales.
 *
 * Es GLOBAL, no de una colección: estas preguntas se reciclan entre materias y
 * lo que las organiza son las etiquetas. Por eso vive en el menú de admin y no
 * dentro de Contenidos, donde todo cuelga de una asignatura.
 */
export default function EscenariosBancoPage() {
  const { sessionToken } = useAuth();
  const [preguntas, setPreguntas] = useState<EscenarioPregunta[]>([]);
  const [verArchivadas, setVerArchivadas] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<EscenarioPregunta | null>(null);
  const [borrador, setBorrador] = useState<Borrador>(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [modalError, setModalError] = useState('');
  const [proyectando, setProyectando] = useState<EscenarioPregunta | null>(null);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  };

  const fetchPreguntas = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/escenarios?archivadas=${verArchivadas}`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) throw new Error('Error al cargar el banco de escenarios');
      const data = (await res.json()) as { preguntas?: EscenarioPregunta[] };
      setPreguntas(data.preguntas ?? []);
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al cargar el banco de escenarios'));
    } finally {
      setLoading(false);
    }
  }, [sessionToken, verArchivadas]);

  useEffect(() => { fetchPreguntas(); }, [fetchPreguntas]);

  function abrirNueva() {
    setEditando(null);
    setBorrador(VACIO);
    setModalError('');
    setModalOpen(true);
  }

  function abrirEdicion(p: EscenarioPregunta) {
    setEditando(p);
    setBorrador({
      titulo: p.titulo,
      texto: p.texto,
      etiquetas: p.etiquetas.join(', '),
      duracionSegundos: String(p.duracionSegundos),
      notas: p.notas,
    });
    setModalError('');
    setModalOpen(true);
  }

  async function handleGuardar() {
    setGuardando(true);
    setModalError('');
    try {
      const cuerpo = {
        titulo: borrador.titulo,
        texto: borrador.texto,
        etiquetas: parsearEtiquetas(borrador.etiquetas),
        duracionSegundos: Number(borrador.duracionSegundos),
        notas: borrador.notas,
      };
      const res = await fetch(
        editando ? `${API_BASE}/admin/escenarios/${editando.id}` : `${API_BASE}/admin/escenarios`,
        { method: editando ? 'PUT' : 'POST', headers, body: JSON.stringify(cuerpo) },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || 'Error al guardar');
      }
      setModalOpen(false);
      await fetchPreguntas();
    } catch (err: unknown) {
      setModalError(mensajeDeError(err, 'Error al guardar'));
    } finally {
      setGuardando(false);
    }
  }

  async function handleArchivar(p: EscenarioPregunta) {
    try {
      const res = await fetch(`${API_BASE}/admin/escenarios/${p.id}`, {
        method: 'PUT', headers, body: JSON.stringify({ archivada: !p.archivada }),
      });
      if (!res.ok) throw new Error('Error al archivar');
      await fetchPreguntas();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al archivar'));
    }
  }

  async function handleEliminar(p: EscenarioPregunta) {
    if (!(await confirmar({
      titulo: `¿Eliminar «${p.titulo}»?`,
      texto: 'Si ya se la asignaste a alguien, archívala en vez de borrarla.',
      confirmar: 'Eliminar',
      peligro: true,
    }))) return;
    try {
      const res = await fetch(`${API_BASE}/admin/escenarios/${p.id}`, { method: 'DELETE', headers });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        // 409 = está en uso. Es información, no un fallo: se dice y se ofrece
        // archivar, que es lo que había que hacer.
        await avisar({ titulo: 'No se puede eliminar', texto: err.message || 'Error al eliminar', icono: 'warning' });
        return;
      }
      await fetchPreguntas();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al eliminar'));
    }
  }

  const columnHelper = createColumnHelper<EscenarioPregunta>();
  const columns = useMemo(() => [
    columnHelper.accessor('titulo', { header: 'Título' }),
    columnHelper.accessor((row) => row.etiquetas.join(' '), {
      id: 'etiquetas',
      header: 'Etiquetas',
      cell: (info) => {
        const etiquetas = info.row.original.etiquetas;
        if (etiquetas.length === 0) return <span className={styles.sinEtiquetas}>—</span>;
        return (
          <span className={styles.chips}>
            {etiquetas.map((e) => <span key={e} className={styles.chip}>{e}</span>)}
          </span>
        );
      },
    }),
    columnHelper.accessor('duracionSegundos', {
      header: 'Tiempo',
      cell: (info) => formatearDuracion(info.getValue()),
    }),
    columnHelper.accessor('archivada', {
      header: 'Estado',
      cell: (info) => (
        <span className={`${styles.badge} ${info.getValue() ? styles.badgeDraft : styles.badgeActive}`}>
          {info.getValue() ? 'Archivada' : 'En uso'}
        </span>
      ),
    }),
  ], [columnHelper]);

  const getActions = (p: EscenarioPregunta): ActionItem[] => [
    { label: 'Editar', icon: 'edit', onClick: () => abrirEdicion(p) },
    { label: 'Proyectar', icon: 'slideshow', onClick: () => setProyectando(p) },
    {
      label: p.archivada ? 'Devolver al banco' : 'Archivar',
      icon: p.archivada ? 'unarchive' : 'archive',
      onClick: () => handleArchivar(p),
    },
    { label: 'Eliminar', icon: 'delete', onClick: () => handleEliminar(p), variant: 'danger' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Escenarios</h1>
          <p className={styles.subtitulo}>
            Preguntas para las entrevistas personales. El banco es común a todas las materias:
            lo que las organiza son las etiquetas. Los alumnos no las ven en ningún momento.
          </p>
        </div>
        <label className={styles.toggleArchivadas}>
          <input
            type="checkbox"
            checked={verArchivadas}
            onChange={(e) => setVerArchivadas(e.target.checked)}
          />
          <span>Ver archivadas</span>
        </label>
      </div>

      {error && <div className={styles.error} onClick={() => setError('')}>{error}</div>}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <AdminTable
          title="Banco de preguntas"
          columns={columns}
          data={preguntas}
          actions={getActions}
          onAdd={abrirNueva}
          addLabel="Nuevo Escenario"
          emptyMessage="Todavía no hay preguntas en el banco."
          searchPlaceholder="Buscar por título o etiqueta..."
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? 'Editar escenario' : 'Nuevo escenario'}
        wide
      >
        {modalError && <div className={styles.error}>{modalError}</div>}
        <div className={styles.form}>
          <label className={styles.campo}>
            <span>Título</span>
            <input
              type="text"
              value={borrador.titulo}
              onChange={(e) => setBorrador({ ...borrador, titulo: e.target.value })}
              placeholder="Conflicto en el equipo"
              autoFocus
            />
            <small>El rótulo con el que lo eliges en el roster. Corto.</small>
          </label>

          <label className={styles.campo}>
            <span>Pregunta</span>
            <textarea
              rows={7}
              value={borrador.texto}
              onChange={(e) => setBorrador({ ...borrador, texto: e.target.value })}
              placeholder={'Se acepta Markdown.\n\nDescribe una situación en la que…'}
            />
            <small>Esto es lo que se proyecta. Acepta Markdown (negritas, listas, código).</small>
          </label>

          <div className={styles.fila}>
            <label className={styles.campo}>
              <span>Etiquetas</span>
              <input
                type="text"
                value={borrador.etiquetas}
                onChange={(e) => setBorrador({ ...borrador, etiquetas: e.target.value })}
                placeholder="trabajo en equipo, ética, tc2007b"
              />
              <small>Separadas por comas. Es con lo que filtras al asignar.</small>
            </label>

            <label className={`${styles.campo} ${styles.campoCorto}`}>
              <span>Tiempo (segundos)</span>
              <input
                type="number"
                min={15}
                max={3600}
                value={borrador.duracionSegundos}
                onChange={(e) => setBorrador({ ...borrador, duracionSegundos: e.target.value })}
              />
              <small>Se puede ajustar por alumno.</small>
            </label>
          </div>

          <label className={styles.campo}>
            <span>Notas para ti</span>
            <textarea
              rows={3}
              value={borrador.notas}
              onChange={(e) => setBorrador({ ...borrador, notas: e.target.value })}
              placeholder="Qué buscar en la respuesta…"
            />
            <small>No se proyecta nunca. Solo la ves tú durante la entrevista.</small>
          </label>
        </div>

        <div className={styles.acciones}>
          <DashButton variant="outline" onClick={() => setModalOpen(false)} disabled={guardando}>
            Cancelar
          </DashButton>
          <DashButton onClick={handleGuardar} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </DashButton>
        </div>
      </Modal>

      {/* Proyectar desde el banco: sirve para comprobar cómo se lee y cuánto
          ocupa antes de asignárselo a nadie. Sin alumno ni notas. */}
      {proyectando && (
        <EscenarioProyector
          pregunta={proyectando}
          onSalir={() => setProyectando(null)}
        />
      )}

      <p className={styles.pie}>
        <Icon name="info" size="sm" />
        Para usarlo en un grupo, enciende <strong>Escenarios</strong> en sus Asignaciones.
      </p>
    </div>
  );
}
