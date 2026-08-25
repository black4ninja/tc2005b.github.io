import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router';
import { createColumnHelper } from '@tanstack/react-table';
import { confirmar, avisar } from '../../../../utils/dialogos';
import { useAuth } from '../../../../context/AuthContext';
import AdminTable from '../../organisms/AdminTable/AdminTable';
import type { ActionItem } from '../../organisms/AdminTable/AdminTable';
import Modal from '../../atoms/Modal/Modal';
import DashButton from '../../atoms/DashButton/DashButton';
import Icon from '../../atoms/Icon/Icon';
import PreguntaProyector from '../../organisms/PreguntaProyector/PreguntaProyector';
import { formatearDuracion, parsearEtiquetas, resumenPregunta } from '../../../../utils/preguntas';
import type { Pregunta } from '../../../../types/preguntas';
import styles from './PreguntasBancoPage.module.css';

const API_BASE = '/api';

function mensajeDeError(e: unknown, porDefecto: string): string {
  return e instanceof Error && e.message ? e.message : porDefecto;
}

/** Competencia del catálogo, tal como la sirve /admin/competencias. */
interface CompetenciaOption {
  id: string;
  competencia: string;
  coleccionId: string | null;
  coleccion: { clave: string | null; nombre: string | null } | null;
  esCalculada?: boolean;
}

interface Borrador {
  texto: string;
  competenciaId: string;
  etiquetas: string;
  notas: string;
}

const VACIO: Borrador = { texto: '', competenciaId: '', etiquetas: '', notas: '' };

/** Segundos del módulo cuando ni la materia ni el grupo dicen otra cosa. */
const DURACION_POR_DEFECTO = 180;

/**
 * Banco de PREGUNTAS de una materia: lo que el profesor plantea en las
 * entrevistas personales.
 *
 * Cuelga de la colección, como Ejercicios y Diagramas, y por una razón que no es
 * solo de simetría: la categoría de una pregunta es una **competencia**, y las
 * competencias son de una colección.
 */
export default function PreguntasBancoPage() {
  const { id: coleccionId } = useParams<{ id: string }>();
  const { sessionToken } = useAuth();
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [competencias, setCompetencias] = useState<CompetenciaOption[]>([]);
  const [nombreColeccion, setNombreColeccion] = useState('');
  // Tiempo de la materia: es del módulo, no de cada pregunta. null = el del módulo.
  const [duracionMateria, setDuracionMateria] = useState<number | null>(null);
  const [editandoDuracion, setEditandoDuracion] = useState(false);
  const [duracionBorrador, setDuracionBorrador] = useState('');
  const [verArchivadas, setVerArchivadas] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Pregunta | null>(null);
  const [borrador, setBorrador] = useState<Borrador>(VACIO);
  const [verOtrasMaterias, setVerOtrasMaterias] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [modalError, setModalError] = useState('');
  const [proyectando, setProyectando] = useState<Pregunta | null>(null);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  };

  const fetchPreguntas = useCallback(async () => {
    if (!coleccionId) return;
    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE}/admin/colecciones/${coleccionId}/preguntas?archivadas=${verArchivadas}`,
        { headers: { 'x-session-token': sessionToken ?? '' } },
      );
      if (!res.ok) throw new Error('Error al cargar el banco de preguntas');
      const data = (await res.json()) as { preguntas?: Pregunta[] };
      setPreguntas(data.preguntas ?? []);
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al cargar el banco de preguntas'));
    } finally {
      setLoading(false);
    }
  }, [coleccionId, sessionToken, verArchivadas]);

  /**
   * TODAS las competencias, no solo las de esta colección: se puede enlazar una
   * de otra materia. El selector las separa, pero el dato tiene que estar.
   */
  const fetchCompetencias = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/competencias`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { competencias?: CompetenciaOption[] };
      // Las calculadas no se evalúan en entrevista: salen de una fórmula sobre
      // las demás, así que preguntarle al alumno por ellas no significa nada.
      setCompetencias((data.competencias ?? []).filter((c) => !c.esCalculada));
    } catch {
      // El selector se queda vacío; la pregunta se puede guardar sin competencia.
    }
  }, [sessionToken]);

  const fetchNombre = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/colecciones`, { headers: { 'x-session-token': sessionToken ?? '' } });
      if (!res.ok) return;
      const data = (await res.json()) as {
        colecciones?: { id: string; nombre: string; clave: string | null; preguntasDuracionSegundos?: number | null }[];
      };
      const c = (data.colecciones ?? []).find((x) => x.id === coleccionId);
      if (c) {
        setNombreColeccion(c.clave ? `${c.clave} — ${c.nombre}` : c.nombre);
        setDuracionMateria(c.preguntasDuracionSegundos ?? null);
      }
    } catch {
      // el nombre es cosmético; ignorar
    }
  }, [coleccionId, sessionToken]);

  async function guardarDuracion() {
    const crudo = duracionBorrador.trim();
    try {
      const res = await fetch(`${API_BASE}/admin/colecciones/${coleccionId}`, {
        method: 'PUT',
        headers,
        // Vacío = quitar el ajuste y volver al tiempo del módulo.
        body: JSON.stringify({ preguntasDuracionSegundos: crudo === '' ? null : Number(crudo) }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || 'Error al guardar el tiempo');
      }
      setEditandoDuracion(false);
      await fetchNombre();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al guardar el tiempo'));
    }
  }

  useEffect(() => {
    fetchPreguntas();
    fetchCompetencias();
    fetchNombre();
  }, [fetchPreguntas, fetchCompetencias, fetchNombre]);

  const propias = useMemo(
    () => competencias.filter((c) => c.coleccionId === coleccionId),
    [competencias, coleccionId],
  );
  const ajenas = useMemo(
    () => competencias.filter((c) => c.coleccionId !== coleccionId),
    [competencias, coleccionId],
  );

  function abrirNueva() {
    setEditando(null);
    setBorrador(VACIO);
    setVerOtrasMaterias(false);
    setModalError('');
    setModalOpen(true);
  }

  function abrirEdicion(p: Pregunta) {
    setEditando(p);
    setBorrador({
      texto: p.texto,
      competenciaId: p.competenciaId ?? '',
      etiquetas: p.etiquetas.join(', '),
      notas: p.notas,
    });
    // Si la que tiene puesta es de otra materia, el selector se abre ya
    // mostrándolas: si no, el campo aparecería en blanco al editar.
    setVerOtrasMaterias(!!p.competencia && p.competencia.coleccionId !== coleccionId);
    setModalError('');
    setModalOpen(true);
  }

  async function handleGuardar() {
    setGuardando(true);
    setModalError('');
    try {
      const cuerpo = {
        texto: borrador.texto,
        competenciaId: borrador.competenciaId,
        etiquetas: parsearEtiquetas(borrador.etiquetas),
        notas: borrador.notas,
      };
      const res = await fetch(
        editando
          ? `${API_BASE}/admin/preguntas/${editando.id}`
          : `${API_BASE}/admin/colecciones/${coleccionId}/preguntas`,
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

  async function handleArchivar(p: Pregunta) {
    try {
      const res = await fetch(`${API_BASE}/admin/preguntas/${p.id}`, {
        method: 'PUT', headers, body: JSON.stringify({ archivada: !p.archivada }),
      });
      if (!res.ok) throw new Error('Error al archivar');
      await fetchPreguntas();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al archivar'));
    }
  }

  async function handleEliminar(p: Pregunta) {
    if (!(await confirmar({
      titulo: '¿Eliminar esta pregunta?',
      html: `<em>${resumenPregunta(p.texto, 120)}</em>`,
      confirmar: 'Eliminar',
      peligro: true,
    }))) return;
    try {
      const res = await fetch(`${API_BASE}/admin/preguntas/${p.id}`, { method: 'DELETE', headers });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        // 409 = está en uso. Es información, no un fallo: se dice y se recuerda
        // que archivar es lo que había que hacer.
        await avisar({ titulo: 'No se puede eliminar', texto: err.message || 'Error al eliminar', icono: 'warning' });
        return;
      }
      await fetchPreguntas();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al eliminar'));
    }
  }

  const columnHelper = createColumnHelper<Pregunta>();
  const columns = useMemo(() => [
    // El accessor devuelve el texto ENTERO para que el buscador de la tabla mire
    // dentro de la pregunta; la celda pinta solo el arranque.
    columnHelper.accessor('texto', {
      header: 'Pregunta',
      cell: (info) => <span className={styles.textoPregunta}>{resumenPregunta(info.getValue())}</span>,
    }),
    columnHelper.accessor((row) => row.competencia?.competencia ?? '', {
      id: 'competencia',
      header: 'Competencia',
      cell: (info) => {
        const comp = info.row.original.competencia;
        if (!comp) return <span className={styles.sinEtiquetas}>—</span>;
        const deOtra = comp.coleccionId !== coleccionId;
        return (
          <span className={`${styles.competencia} ${deOtra ? styles.competenciaAjena : ''}`}
            title={deOtra ? 'Competencia de otra materia' : undefined}>
            {deOtra && <Icon name="swap_horiz" size="sm" />}
            {comp.competencia}
          </span>
        );
      },
    }),
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
    // Una pregunta asignada no se puede volver a repartir mientras el grupo
    // siga activo: sin esta columna, el autor no tiene forma de saber cuánto
    // banco libre le queda.
    columnHelper.accessor((row) => (row.uso ? 'asignada' : 'libre'), {
      id: 'uso',
      header: 'Uso',
      cell: (info) => {
        const uso = info.row.original.uso;
        if (!uso) return <span className={styles.libreTag}>Libre</span>;
        return (
          <span className={styles.tomadaTag} title={`${uso.alumnoNombre} · ${uso.grupoNombre}`}>
            <Icon name="person" size="sm" />
            {uso.alumnoNombre}
            {uso.usada && ' · preguntada'}
          </span>
        );
      },
    }),
    columnHelper.accessor('archivada', {
      header: 'Estado',
      cell: (info) => (
        <span className={`${styles.badge} ${info.getValue() ? styles.badgeDraft : styles.badgeActive}`}>
          {info.getValue() ? 'Archivada' : 'En uso'}
        </span>
      ),
    }),
  ], [columnHelper, coleccionId]);

  const getActions = (p: Pregunta): ActionItem[] => [
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
          <Link to={`/admin/contenidos/${coleccionId}`} className={styles.volver}>
            <Icon name="arrow_back" size="sm" />
            <span>Colección</span>
          </Link>
          <h1 className={styles.pageTitle}>Preguntas{nombreColeccion ? ` — ${nombreColeccion}` : ''}</h1>
          <p className={styles.subtitulo}>
            Preguntas para las entrevistas personales, agrupadas por la competencia que exploran.
            Los alumnos no las ven en ningún momento.
          </p>
        </div>
        <div className={styles.headerLado}>
          {/* El tiempo es del módulo en esta materia, no de cada pregunta: por
              eso se configura una vez aquí arriba y no en cada formulario. */}
          <div className={styles.duracion}>
            <Icon name="timer" size="sm" />
            {editandoDuracion ? (
              <>
                <input
                  className={styles.duracionInput}
                  type="number"
                  min={15}
                  max={3600}
                  autoFocus
                  value={duracionBorrador}
                  onChange={(e) => setDuracionBorrador(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') guardarDuracion();
                    if (e.key === 'Escape') setEditandoDuracion(false);
                  }}
                  placeholder="180"
                />
                <button className={styles.enlaceBtn} onClick={guardarDuracion}>Guardar</button>
                <button className={styles.enlaceBtn} onClick={() => setEditandoDuracion(false)}>Cancelar</button>
              </>
            ) : (
              <>
                <span>
                  Tiempo por pregunta: <strong>{formatearDuracion(duracionMateria ?? DURACION_POR_DEFECTO)}</strong>
                  {duracionMateria === null && <span className={styles.duracionFuente}> (por defecto)</span>}
                </span>
                <button
                  className={styles.enlaceBtn}
                  onClick={() => {
                    setDuracionBorrador(duracionMateria === null ? '' : String(duracionMateria));
                    setEditandoDuracion(true);
                  }}
                >
                  editar
                </button>
              </>
            )}
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
          addLabel="Nueva Pregunta"
          emptyMessage="Esta materia todavía no tiene preguntas."
          searchPlaceholder="Buscar en la pregunta, competencia o etiqueta..."
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? 'Editar pregunta' : 'Nueva pregunta'}
        wide
      >
        {modalError && <div className={styles.error}>{modalError}</div>}
        <div className={styles.form}>
          <label className={styles.campo}>
            <span>Competencia</span>
            <select
              value={borrador.competenciaId}
              onChange={(e) => setBorrador({ ...borrador, competenciaId: e.target.value })}
            >
              <option value="">— Sin competencia —</option>
              <optgroup label={nombreColeccion || 'Esta materia'}>
                {propias.map((c) => (
                  <option key={c.id} value={c.id}>{c.competencia}</option>
                ))}
              </optgroup>
              {verOtrasMaterias && (
                <optgroup label="Otras materias">
                  {ajenas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {(c.coleccion?.clave || '—')} · {c.competencia}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <small>
              Es la categoría de la pregunta: por ella se agrupa y se filtra al asignar.
              Puede quedarse sin ninguna (abrir la entrevista, romper el hielo).{' '}
              {!verOtrasMaterias && ajenas.length > 0 && (
                <button type="button" className={styles.enlaceBtn} onClick={() => setVerOtrasMaterias(true)}>
                  Ver competencias de otras materias
                </button>
              )}
            </small>
          </label>

          <label className={styles.campo}>
            <span>Pregunta</span>
            <textarea
              rows={7}
              autoFocus
              value={borrador.texto}
              onChange={(e) => setBorrador({ ...borrador, texto: e.target.value })}
              placeholder={'Se acepta Markdown.\n\nDescribe una situación en la que…'}
            />
            <small>Esto es lo que se proyecta. Acepta Markdown (negritas, listas, código).</small>
          </label>

          <label className={styles.campo}>
            <span>Etiquetas</span>
            <input
              type="text"
              value={borrador.etiquetas}
              onChange={(e) => setBorrador({ ...borrador, etiquetas: e.target.value })}
              placeholder="parcial 2, difícil, perfil técnico"
            />
            <small>Separadas por comas. Matizan lo que la competencia no distingue.</small>
          </label>

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
          ocupa antes de asignársela a nadie. Sin alumno ni notas. */}
      {proyectando && (
        <PreguntaProyector
          pregunta={proyectando}
          duracionSegundos={duracionMateria ?? DURACION_POR_DEFECTO}
          onSalir={() => setProyectando(null)}
        />
      )}

      <p className={styles.pie}>
        <Icon name="info" size="sm" />
        Para usarlas en un grupo, enciende <strong>Preguntas</strong> en esta materia desde
        Grupos → Asignaciones.
      </p>
    </div>
  );
}
