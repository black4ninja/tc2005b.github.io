import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import Icon from '../../atoms/Icon/Icon';
import DashButton from '../../atoms/DashButton/DashButton';
import Modal from '../../atoms/Modal/Modal';
import PreguntaProyector from '../../organisms/PreguntaProyector/PreguntaProyector';
import SelectorPregunta from '../../organisms/SelectorPregunta/SelectorPregunta';
import { formatearDuracion, repartirPreguntas, resumenPregunta } from '../../../../utils/preguntas';
import type {
  AlumnoConPregunta, CompetenciaEnBanco, DuracionConfig, Pregunta, PreguntaAsignacion,
} from '../../../../types/preguntas';
import styles from './PreguntasGrupoPage.module.css';

const API_BASE = '/api';

function mensajeDeError(e: unknown, porDefecto: string): string {
  return e instanceof Error && e.message ? e.message : porDefecto;
}

/**
 * Roster de PREGUNTAS de un grupo: a quién le toca qué pregunta.
 *
 * La pantalla está montada alrededor de una restricción concreta: son muchos
 * alumnos y hay que personalizar. Por eso hay tres formas de asignar y no una,
 * y ninguna abre un formulario:
 *  · el **sello** — se elige una pregunta arriba y luego un clic por alumno;
 *  · el **selector por fila** — para el alumno concreto que necesita otra cosa;
 *  · el **reparto** — llena de golpe a los que faltan sin repetir de más.
 * Guardar es inmediato y optimista: pintar antes de que responda el servidor es
 * lo que hace que sellar treinta alumnos se sienta como treinta clics y no como
 * treinta esperas.
 */
export default function PreguntasGrupoPage() {
  const { id: grupoId } = useParams<{ id: string }>();
  const { sessionToken } = useAuth();

  const [habilitado, setHabilitado] = useState(true);
  const [alumnos, setAlumnos] = useState<AlumnoConPregunta[]>([]);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [competencias, setCompetencias] = useState<CompetenciaEnBanco[]>([]);
  const [duracion, setDuracion] = useState<DuracionConfig | null>(null);
  const [editandoDuracion, setEditandoDuracion] = useState(false);
  const [duracionBorrador, setDuracionBorrador] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sello: la pregunta activa. Con una elegida, un clic en la fila la asigna.
  const [selloId, setSelloId] = useState<string | null>(null);
  // Dos ejes de filtro y no uno: la competencia dice QUÉ se explora y la
  // etiqueta, para quién sirve. Se cruzan.
  const [competenciaFiltro, setCompetenciaFiltro] = useState<string | null>(null);
  const [etiquetaFiltro, setEtiquetaFiltro] = useState<string | null>(null);
  const [soloSinAsignar, setSoloSinAsignar] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const [selectorPara, setSelectorPara] = useState<AlumnoConPregunta | null>(null);
  const [selectorSello, setSelectorSello] = useState(false);
  const [historialDe, setHistorialDe] = useState<AlumnoConPregunta | null>(null);
  const [historial, setHistorial] = useState<PreguntaAsignacion[]>([]);
  const [proyectando, setProyectando] = useState<number | null>(null);

  const headers = useMemo<Record<string, string>>(() => ({
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  }), [sessionToken]);

  const fetchTodo = useCallback(async () => {
    if (!grupoId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/preguntas`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) throw new Error('Error al cargar las preguntas del grupo');
      const data = await res.json() as {
        habilitado?: boolean;
        alumnos?: AlumnoConPregunta[];
        preguntas?: Pregunta[];
        competencias?: CompetenciaEnBanco[];
        duracion?: DuracionConfig;
      };
      setHabilitado(data.habilitado !== false);
      setAlumnos(data.alumnos ?? []);
      // Por competencia y dentro de ella por el enunciado: la competencia es el
      // eje por el que se busca, así que agrupar por ella deja el selector
      // ordenado como se piensa.
      setPreguntas([...(data.preguntas ?? [])].sort((a, b) => {
        const porComp = (a.competencia?.competencia ?? '~').localeCompare(b.competencia?.competencia ?? '~');
        return porComp !== 0 ? porComp : a.texto.localeCompare(b.texto);
      }));
      setCompetencias(data.competencias ?? []);
      setDuracion(data.duracion ?? null);
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al cargar las preguntas del grupo'));
    } finally {
      setLoading(false);
    }
  }, [grupoId, sessionToken]);

  useEffect(() => { fetchTodo(); }, [fetchTodo]);

  const porId = useMemo(() => new Map(preguntas.map((p) => [p.id, p])), [preguntas]);
  const sello = selloId ? porId.get(selloId) ?? null : null;

  const etiquetas = useMemo(() => {
    const todas = new Set<string>();
    for (const p of preguntas) for (const e of p.etiquetas) todas.add(e);
    return [...todas].sort();
  }, [preguntas]);

  /** Las preguntas que el sello, el selector y el reparto tienen a mano. */
  const preguntasFiltradas = useMemo(
    () => preguntas.filter(
      (p) => (!competenciaFiltro || p.competenciaId === competenciaFiltro)
        && (!etiquetaFiltro || p.etiquetas.includes(etiquetaFiltro)),
    ),
    [preguntas, competenciaFiltro, etiquetaFiltro],
  );

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return alumnos.filter((a) => {
      if (soloSinAsignar && a.asignacion) return false;
      if (!texto) return true;
      return a.name.toLowerCase().includes(texto) || a.matricula.toLowerCase().includes(texto);
    });
  }, [alumnos, soloSinAsignar, busqueda]);

  const sinAsignar = useMemo(() => alumnos.filter((a) => !a.asignacion), [alumnos]);

  /**
   * Qué tiempo rige y de dónde sale. Manda la anulación del grupo; si no la hay
   * y todas las materias del grupo coinciden, el suyo; y si discrepan no se
   * inventa una cifra única —cada pregunta lleva la de SU materia— y la cabecera
   * lo dice en vez de mentir.
   */
  const { duracionVigente, fuenteDuracion } = useMemo(() => {
    if (!duracion) return { duracionVigente: 180, fuenteDuracion: '' };
    if (duracion.grupo !== null) {
      return { duracionVigente: duracion.grupo, fuenteDuracion: 'de este grupo' };
    }
    const valores = new Set(duracion.materias.map((m) => m.duracionSegundos ?? duracion.porDefecto));
    if (valores.size <= 1) {
      const materia = duracion.materias[0];
      return {
        duracionVigente: [...valores][0] ?? duracion.porDefecto,
        fuenteDuracion: materia?.duracionSegundos != null
          ? `de ${materia.clave ?? materia.nombre ?? 'la materia'}`
          : 'por defecto',
      };
    }
    return { duracionVigente: duracion.porDefecto, fuenteDuracion: 'según cada materia' };
  }, [duracion]);

  /** Alumnos proyectables (con pregunta), en el orden en que se ven. */
  const paraProyectar = useMemo(() => visibles.filter((a) => a.asignacion?.pregunta), [visibles]);

  async function asignar(pares: { alumnoId: string; preguntaId: string }[]) {
    if (pares.length === 0 || !grupoId) return;
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/preguntas/asignaciones`, {
        method: 'POST', headers, body: JSON.stringify({ asignaciones: pares }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || 'Error al asignar');
      }
      const data = await res.json() as { asignaciones?: PreguntaAsignacion[] };
      const nuevas = new Map((data.asignaciones ?? []).map((a) => [a.alumnoId, a]));
      setAlumnos((prev) => prev.map((a) => {
        const nueva = nuevas.get(a.id);
        if (!nueva) return a;
        return { ...a, asignacion: nueva, totalAsignaciones: a.totalAsignaciones + 1 };
      }));
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al asignar'));
      // Se recarga para no dejar la pantalla mintiendo sobre lo que hay guardado.
      await fetchTodo();
    }
  }

  async function quitar(alumno: AlumnoConPregunta) {
    if (!alumno.asignacion || !grupoId) return;
    const asignacionId = alumno.asignacion.id;
    setAlumnos((prev) => prev.map((a) => (a.id === alumno.id ? { ...a, asignacion: null } : a)));
    try {
      const res = await fetch(
        `${API_BASE}/admin/grupos/${grupoId}/preguntas/asignaciones/${asignacionId}`,
        { method: 'DELETE', headers },
      );
      if (!res.ok) throw new Error('Error al quitar la asignación');
      // El historial es la fuente: quitar la vigente puede dejar visible la
      // anterior, y eso solo lo sabe el servidor.
      await fetchTodo();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al quitar la asignación'));
      await fetchTodo();
    }
  }

  async function actualizar(alumno: AlumnoConPregunta, cambios: { nota?: string; usada?: boolean }) {
    if (!alumno.asignacion || !grupoId) return;
    const asignacionId = alumno.asignacion.id;
    setAlumnos((prev) => prev.map((a) => (
      a.id === alumno.id && a.asignacion
        ? { ...a, asignacion: { ...a.asignacion, ...cambios } }
        : a
    )));
    try {
      const res = await fetch(
        `${API_BASE}/admin/grupos/${grupoId}/preguntas/asignaciones/${asignacionId}`,
        { method: 'PUT', headers, body: JSON.stringify(cambios) },
      );
      if (!res.ok) throw new Error('Error al guardar el cambio');
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al guardar el cambio'));
      await fetchTodo();
    }
  }

  async function guardarDuracion() {
    const crudo = duracionBorrador.trim();
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/preguntas/configuracion`, {
        method: 'PUT',
        headers,
        // Vacío = quitar la anulación y volver al tiempo de la materia.
        body: JSON.stringify({ duracionSegundos: crudo === '' ? null : Number(crudo) }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || 'Error al guardar el tiempo');
      }
      setEditandoDuracion(false);
      // Recarga entera: el tiempo cambia el de TODAS las preguntas del roster.
      await fetchTodo();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al guardar el tiempo'));
    }
  }

  async function abrirHistorial(alumno: AlumnoConPregunta) {
    setHistorialDe(alumno);
    setHistorial([]);
    try {
      const res = await fetch(
        `${API_BASE}/admin/grupos/${grupoId}/preguntas/alumnos/${alumno.id}`,
        { headers: { 'x-session-token': sessionToken ?? '' } },
      );
      if (!res.ok) return;
      const data = await res.json() as { historial?: PreguntaAsignacion[] };
      setHistorial(data.historial ?? []);
    } catch {
      // El historial es consulta: si falla, el modal se queda vacío y ya.
    }
  }

  /** Clic en la fila: con sello puesto asigna; sin él, abre el selector. */
  function handleFila(alumno: AlumnoConPregunta) {
    if (sello) asignar([{ alumnoId: alumno.id, preguntaId: sello.id }]);
    else setSelectorPara(alumno);
  }

  function handleRepartir() {
    const pool = preguntasFiltradas.filter((p) => !p.archivada);
    if (pool.length === 0 || sinAsignar.length === 0) return;
    asignar(repartirPreguntas(sinAsignar.map((a) => a.id), pool.map((p) => p.id)));
  }

  function handleSellarLosQueFaltan() {
    if (!sello) return;
    asignar(sinAsignar.map((a) => ({ alumnoId: a.id, preguntaId: sello.id })));
  }

  if (loading) return <div className={styles.page}><p>Cargando...</p></div>;

  if (!habilitado) {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>Preguntas</h1>
        <div className={styles.apagado}>
          <Icon name="quiz" size="lg" />
          <p>Ninguna materia de este grupo tiene el módulo <strong>Preguntas</strong> encendido.</p>
          <p className={styles.hint}>
            Se enciende en <Link to="/admin/grupos">Grupos → Asignaciones</Link>, dentro de la materia
            que se evalúa. El banco se llena en Contenidos → la materia → Preguntas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Preguntas</h1>
          <p className={styles.subtitulo}>
            La pregunta que le toca a cada alumno en su entrevista. Los alumnos no ven nada de esto.
          </p>
        </div>
        <div className={styles.headerLado}>
          {/* El tiempo es del módulo, no de cada pregunta: se ve y se ajusta una
              vez, aquí, y vale para todo el grupo. */}
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
                  placeholder={String(duracionVigente)}
                />
                <button className={styles.enlaceBtn} onClick={guardarDuracion}>Guardar</button>
                <button className={styles.enlaceBtn} onClick={() => setEditandoDuracion(false)}>Cancelar</button>
              </>
            ) : (
              <>
                <span>
                  Tiempo: <strong>{formatearDuracion(duracionVigente)}</strong>
                  {fuenteDuracion && <span className={styles.duracionFuente}> ({fuenteDuracion})</span>}
                </span>
                <button
                  className={styles.enlaceBtn}
                  onClick={() => {
                    setDuracionBorrador(duracion?.grupo === null || duracion?.grupo === undefined ? '' : String(duracion.grupo));
                    setEditandoDuracion(true);
                  }}
                  title="Ajustar el tiempo solo para este grupo; vacío vuelve al de la materia"
                >
                  editar
                </button>
              </>
            )}
          </div>
          <span className={styles.contador}>
            {alumnos.length - sinAsignar.length} de {alumnos.length} asignados
          </span>
        </div>
      </div>

      {error && <div className={styles.error} onClick={() => setError('')}>{error}</div>}

      <div className={styles.barra}>
        <div className={styles.selloCaja}>
          <span className={styles.barraTitulo}>Pregunta activa</span>
          <button className={styles.selloBtn} onClick={() => setSelectorSello(true)}>
            <Icon name={sello ? 'edit' : 'add'} size="sm" />
            <span>{sello ? resumenPregunta(sello.texto, 70) : 'Elegir una…'}</span>
          </button>
          {sello && (
            <button className={styles.selloQuitar} onClick={() => setSelloId(null)} title="Soltar la pregunta activa">
              <Icon name="close" size="sm" />
            </button>
          )}
        </div>

        <div className={styles.acciones}>
          <DashButton
            variant="outline"
            onClick={handleSellarLosQueFaltan}
            disabled={!sello || sinAsignar.length === 0}
            title={sello ? `Se la pone a los ${sinAsignar.length} sin asignar` : 'Elige antes una pregunta activa'}
          >
            Esta a los que faltan ({sinAsignar.length})
          </DashButton>
          <DashButton
            variant="outline"
            onClick={handleRepartir}
            disabled={sinAsignar.length === 0 || preguntasFiltradas.length === 0}
            title="Reparte las preguntas del filtro entre los que no tienen, sin repetir de más"
          >
            Repartir al azar
          </DashButton>
          <DashButton
            onClick={() => setProyectando(0)}
            disabled={paraProyectar.length === 0}
            title="Abre la primera pregunta a pantalla completa; se avanza con ← →"
          >
            <Icon name="slideshow" size="sm" /> Proyectar
          </DashButton>
        </div>
      </div>

      {sello && (
        <p className={styles.pista}>
          <Icon name="touch_app" size="sm" />
          Haz clic en un alumno para asignarle: <strong>{resumenPregunta(sello.texto, 80)}</strong>
        </p>
      )}

      <div className={styles.filtros}>
        <input
          className={styles.buscador}
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar alumno..."
        />
        <label className={styles.check}>
          <input type="checkbox" checked={soloSinAsignar} onChange={(e) => setSoloSinAsignar(e.target.checked)} />
          <span>Solo sin asignar</span>
        </label>
        {competencias.length > 0 && (
          <div className={styles.chips}>
            <span className={styles.chipsTitulo}>Competencia:</span>
            <button
              className={`${styles.chip} ${competenciaFiltro === null ? styles.chipActivo : ''}`}
              onClick={() => setCompetenciaFiltro(null)}
            >
              todas
            </button>
            {competencias.map((c) => (
              <button
                key={c.id}
                className={`${styles.chip} ${competenciaFiltro === c.id ? styles.chipActivo : ''}`}
                onClick={() => setCompetenciaFiltro(competenciaFiltro === c.id ? null : c.id)}
              >
                {c.nombre}
              </button>
            ))}
          </div>
        )}
        {etiquetas.length > 0 && (
          <div className={styles.chips}>
            <span className={styles.chipsTitulo}>Etiqueta:</span>
            <button
              className={`${styles.chip} ${etiquetaFiltro === null ? styles.chipActivo : ''}`}
              onClick={() => setEtiquetaFiltro(null)}
            >
              todas
            </button>
            {etiquetas.map((e) => (
              <button
                key={e}
                className={`${styles.chip} ${etiquetaFiltro === e ? styles.chipActivo : ''}`}
                onClick={() => setEtiquetaFiltro(etiquetaFiltro === e ? null : e)}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      <table className={styles.tabla}>
        <thead>
          <tr>
            <th>Alumno</th>
            <th>Pregunta</th>
            <th>Nota para ti</th>
            <th className={styles.colAcciones}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {visibles.length === 0 && (
            <tr><td colSpan={4} className={styles.vacio}>No hay alumnos que mostrar.</td></tr>
          )}
          {visibles.map((alumno) => {
            const asignacion = alumno.asignacion;
            return (
              <tr key={alumno.id} className={asignacion?.usada ? styles.filaUsada : ''}>
                <td>
                  <span className={styles.alumnoNombre}>{alumno.name}</span>
                  <span className={styles.alumnoMatricula}>{alumno.matricula}</span>
                </td>
                <td>
                  {/* La celda entera es el botón de asignar: con el sello puesto
                      es un clic por alumno, que es todo el objetivo. */}
                  <button
                    className={`${styles.celdaPregunta} ${asignacion ? '' : styles.celdaVacia}`}
                    onClick={() => handleFila(alumno)}
                    title={sello ? `Asignar: ${resumenPregunta(sello.texto, 60)}` : 'Elegir pregunta'}
                  >
                    {asignacion?.pregunta ? (
                      <>
                        <span className={styles.preguntaTitulo}>{resumenPregunta(asignacion.pregunta.texto, 70)}</span>
                        {/* La competencia en la propia celda: es lo que hace
                            legible de un vistazo si el grupo está cubriendo
                            todas o si media clase lleva la misma. */}
                        {asignacion.pregunta.competencia && (
                          <span className={styles.competenciaTag}>{asignacion.pregunta.competencia}</span>
                        )}
                        {asignacion.pregunta.archivada && (
                          <span className={styles.archivadaTag} title="Esta pregunta ya no está en el banco">archivada</span>
                        )}
                      </>
                    ) : (
                      <span className={styles.sinPregunta}>Sin asignar</span>
                    )}
                  </button>
                  {asignacion && (
                    <button
                      className={styles.cambiarBtn}
                      onClick={() => setSelectorPara(alumno)}
                      title="Elegir otra pregunta para este alumno"
                    >
                      <Icon name="swap_horiz" size="sm" />
                    </button>
                  )}
                </td>
                <td>
                  <NotaInline
                    key={asignacion?.id ?? 'sin'}
                    valor={asignacion?.nota ?? ''}
                    deshabilitado={!asignacion}
                    onGuardar={(nota) => actualizar(alumno, { nota })}
                  />
                </td>
                <td className={styles.colAcciones}>
                  <button
                    className={styles.iconBtn}
                    disabled={!asignacion?.pregunta}
                    onClick={() => {
                      const i = paraProyectar.findIndex((a) => a.id === alumno.id);
                      if (i >= 0) setProyectando(i);
                    }}
                    title="Proyectar esta pregunta"
                  >
                    <Icon name="slideshow" size="sm" />
                  </button>
                  <button
                    className={`${styles.iconBtn} ${asignacion?.usada ? styles.iconBtnOn : ''}`}
                    disabled={!asignacion}
                    onClick={() => actualizar(alumno, { usada: !asignacion?.usada })}
                    title={asignacion?.usada ? 'Marcar como pendiente' : 'Marcar como ya preguntada'}
                  >
                    <Icon name="check_circle" size="sm" />
                  </button>
                  <button
                    className={styles.iconBtn}
                    onClick={() => abrirHistorial(alumno)}
                    title={`Historial (${alumno.totalAsignaciones})`}
                  >
                    <Icon name="history" size="sm" />
                  </button>
                  <button
                    className={styles.iconBtn}
                    disabled={!asignacion}
                    onClick={() => quitar(alumno)}
                    title="Quitar la asignación"
                  >
                    <Icon name="close" size="sm" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Selector para UN alumno */}
      {selectorPara && (
        <SelectorPregunta
          preguntas={preguntasFiltradas}
          titulo={`Pregunta para ${selectorPara.name}`}
          onElegir={(p) => {
            asignar([{ alumnoId: selectorPara.id, preguntaId: p.id }]);
            setSelectorPara(null);
          }}
          onCerrar={() => setSelectorPara(null)}
        />
      )}

      {/* Selector de la pregunta activa (el sello) */}
      {selectorSello && (
        <SelectorPregunta
          preguntas={preguntasFiltradas}
          titulo="Pregunta activa"
          onElegir={(p) => { setSelloId(p.id); setSelectorSello(false); }}
          onCerrar={() => setSelectorSello(false)}
        />
      )}

      <Modal
        isOpen={historialDe !== null}
        onClose={() => setHistorialDe(null)}
        title={historialDe ? `Historial — ${historialDe.name}` : 'Historial'}
      >
        {historial.length === 0 ? (
          <p className={styles.hint}>Sin asignaciones previas.</p>
        ) : (
          <ul className={styles.historial}>
            {historial.map((a) => (
              <li key={a.id}>
                <span className={styles.historialFecha}>
                  {new Date(a.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <span>{a.pregunta ? resumenPregunta(a.pregunta.texto, 70) : '—'}</span>
                {a.pregunta?.competencia && (
                  <span className={styles.competenciaTag}>{a.pregunta.competencia}</span>
                )}
                {a.usada && <span className={styles.historialUsada}>preguntada</span>}
                {a.nota && <span className={styles.historialNota}>{a.nota}</span>}
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {proyectando !== null && paraProyectar[proyectando]?.asignacion?.pregunta && (() => {
        const alumno = paraProyectar[proyectando];
        const pregunta = porId.get(alumno.asignacion!.pregunta!.id);
        if (!pregunta) return null;
        return (
          <PreguntaProyector
            pregunta={pregunta}
            duracionSegundos={pregunta.duracionSegundos ?? duracionVigente}
            alumno={{ name: alumno.name, matricula: alumno.matricula }}
            posicion={{ indice: proyectando + 1, total: paraProyectar.length }}
            onAnterior={proyectando > 0 ? () => setProyectando(proyectando - 1) : null}
            onSiguiente={proyectando < paraProyectar.length - 1 ? () => setProyectando(proyectando + 1) : null}
            onSalir={() => setProyectando(null)}
          />
        );
      })()}
    </div>
  );
}

/**
 * Nota por alumno. Guarda al salir del campo y no en cada tecla: es un texto
 * corto que se escribe de una sentada, y una petición por pulsación llenaría la
 * red de escrituras a medio escribir.
 */
function NotaInline({ valor, deshabilitado, onGuardar }: {
  valor: string;
  deshabilitado: boolean;
  onGuardar: (nota: string) => void;
}) {
  const [texto, setTexto] = useState(valor);
  const inicial = useRef(valor);

  useEffect(() => { setTexto(valor); inicial.current = valor; }, [valor]);

  return (
    <input
      className={styles.nota}
      type="text"
      value={texto}
      disabled={deshabilitado}
      placeholder={deshabilitado ? '' : 'p. ej. insistir en el conflicto…'}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => { if (texto !== inicial.current) { inicial.current = texto; onGuardar(texto); } }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    />
  );
}
