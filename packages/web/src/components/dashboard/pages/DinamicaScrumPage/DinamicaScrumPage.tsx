import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import TableroScrum from '../../organisms/TableroScrum/TableroScrum';
import ReglasScrumModal from '../../organisms/ReglasScrumModal/ReglasScrumModal';
import { useArrastre } from '../../../../hooks/useArrastre';
import { avisar, confirmar, pedirTexto } from '../../../../utils/dialogos';
import {
  iniciales, rangoFechas, rejillaProyeccion,
  type Dinamica, type EquipoTablero, type Etapa, type Marcador, type Persona, type Sprint,
} from '../../../../utils/scrum';
import BarraEtapasScrum from '../../organisms/BarraEtapasScrum/BarraEtapasScrum';
import styles from './DinamicaScrumPage.module.css';

const API = '/api';

/**
 * Una dinámica por dentro: armar los equipos y ver cómo van sus tableros.
 *
 * El reparto es la pantalla que más se usa y siempre en el mismo momento —los
 * primeros diez minutos de la sesión, con la clase esperando—, así que está
 * pensada para el clic repetido: los sin equipo a la izquierda, se marcan
 * varios y se mandan de golpe, o se arrastra uno a su tarjeta.
 */
export default function DinamicaScrumPage() {
  const { id: grupoId, dinamicaId } = useParams<{ id: string; dinamicaId: string }>();
  const { sessionToken } = useAuth();
  const navigate = useNavigate();

  const [dinamica, setDinamica] = useState<Dinamica | null>(null);
  const [equipos, setEquipos] = useState<EquipoTablero[]>([]);
  const [sinEquipo, setSinEquipo] = useState<Persona[]>([]);
  const [maxEquipos, setMaxEquipos] = useState(9);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [vista, setVista] = useState<'equipos' | 'tableros' | 'sprints'>('equipos');
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintActual, setSprintActual] = useState<string | null>(null);
  const [marcadores, setMarcadores] = useState<Marcador[]>([]);
  // Las penalizaciones se teclean mientras el PO las canta y solo se mandan al
  // cerrar el sprint: hasta entonces son un borrador del profesor.
  const [penalizaciones, setPenalizaciones] = useState<Record<string, number>>({});
  const [reglas, setReglas] = useState<'done' | 'restricciones' | null>(null);
  // Hay una petición en marcha: cerrar un sprint recorre todos los equipos y
  // tarda. Sin esta señal el profesor pulsa dos veces y cierra dos sprints.
  const [enVuelo, setEnVuelo] = useState(false);
  // El velo se pinta un instante DESPUÉS de que empieza el trabajo. Bloquear se
  // bloquea desde el primer momento; lo que se retrasa es el gris, para que un
  // cambio que vuelve en 200 ms no dé un parpadeo por cada alumno del reparto.
  const [velo, setVelo] = useState(false);

  useEffect(() => {
    if (!enVuelo) { setVelo(false); return; }
    const t = window.setTimeout(() => setVelo(true), 180);
    return () => window.clearTimeout(t);
  }, [enVuelo]);
  const [busqueda, setBusqueda] = useState('');
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [mandoAbierto, setMandoAbierto] = useState(false);
  const [proyectados, setProyectados] = useState<Set<string>>(new Set());
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  // La etapa que se está aplicando. El cambio se pinta optimista y el botón
  // dice que viaja: es lo que más se pulsa durante la clase.
  const [aplicandoEtapa, setAplicandoEtapa] = useState<string | null>(null);

  const cabeceras = useCallback(
    (): HeadersInit => ({
      'Content-Type': 'application/json',
      ...(sessionToken ? { 'x-session-token': sessionToken } : {}),
    }),
    [sessionToken],
  );

  const base = `${API}/admin/grupos/${grupoId}/scrum/dinamicas/${dinamicaId}`;

  const cargar = useCallback(async () => {
    if (!grupoId || !dinamicaId || !sessionToken) return;
    try {
      const r = await fetch(base, { headers: cabeceras() });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.message ?? 'No se pudo cargar');
      setDinamica(json.dinamica ?? null);
      setEtapas(json.etapas ?? []);
      setEquipos(json.equipos ?? []);
      setSinEquipo(json.sinEquipo ?? []);
      setMaxEquipos(json.maxEquipos ?? 9);
      setSprints(json.sprints ?? []);
      setSprintActual(json.sprintActual ?? null);
      setMarcadores(json.marcadores ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }, [base, grupoId, dinamicaId, sessionToken, cabeceras]);

  useEffect(() => { void cargar(); }, [cargar]);

  // Los equipos elegidos para proyectar arrancan siendo todos: es lo que se
  // quiere el 90 % de las veces y ahorra marcar nueve casillas.
  useEffect(() => {
    setProyectados((previos) =>
      previos.size === 0 ? new Set(equipos.map((e) => e.id)) : previos,
    );
  }, [equipos]);

  /**
   * Manda un cambio y se queda con lo que el servidor devuelve.
   *
   * Armar los equipos son treinta gestos seguidos con la clase esperando, y
   * hasta ahora cada uno pagaba una recarga del detalle entero —equipos,
   * alumnos, historias, sprints y marcador— para enterarse de que un alumno
   * cambió de columna. Ahora cada cambio devuelve la foto del reparto y aquí
   * solo se fusiona; el detalle completo se recarga cuando el servidor no la
   * manda.
   *
   * Las historias, épicas y demás NO viajan en esa foto: el reparto no las toca,
   * así que se conservan las que ya había.
   */
  const mandar = useCallback(
    async (url: string, metodo: string, cuerpo?: unknown): Promise<boolean> => {
      setEnVuelo(true);
      try {
        const r = await fetch(url, {
          method: metodo,
          headers: cabeceras(),
          body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
        });
        const json = await r.json().catch(() => ({}));
        if (!r.ok) {
          await avisar({ titulo: 'No se pudo', texto: json?.message ?? 'Inténtalo de nuevo', icono: 'error' });
          await cargar();
          return false;
        }
        if (Array.isArray(json?.equipos) && Array.isArray(json?.sinEquipo)) {
          setEquipos((previos) => {
            const antes = new Map(previos.map((e) => [e.id, e]));
            return (json.equipos as Partial<EquipoTablero>[]).map((e) => ({
              historias: [], epicas: [], retro: [], compromisos: [],
              marcador: null, archivadas: 0,
              ...antes.get(e.id!),
              ...e,
            } as EquipoTablero));
          });
          setSinEquipo(json.sinEquipo);
        } else {
          await cargar();
        }
        return true;
      } catch {
        await avisar({ titulo: 'Sin conexión', texto: 'No se pudo contactar al servidor', icono: 'error' });
        return false;
      } finally {
        setEnVuelo(false);
      }
    },
    [cabeceras, cargar],
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return sinEquipo;
    return sinEquipo.filter(
      (a) => a.name.toLowerCase().includes(q) || (a.matricula ?? '').toLowerCase().includes(q),
    );
  }, [sinEquipo, busqueda]);

  function alternarMarcado(id: string) {
    setMarcados((previos) => {
      const copia = new Set(previos);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });
  }

  const asignar = useCallback(
    async (equipoId: string, alumnoIds: string[]) => {
      if (alumnoIds.length === 0) return;
      const ok = await mandar(`${base}/equipos/${equipoId}/miembros`, 'POST', { alumnoIds });
      if (ok) setMarcados(new Set());
    },
    [base, mandar],
  );

  /**
   * Arrastrar un alumno a su equipo. Con el dedo hay que mantener pulsado, que
   * es lo que deja convivir el arrastre con marcar la casilla y con desplazar
   * la lista. Quien no quiera arrastrar tiene el mismo camino de siempre:
   * marcar varios y usar «Asignar a…».
   */
  const soltarAlumno = useCallback(
    (alumno: Persona, equipoId: string) => {
      void asignar(equipoId, [alumno.id]);
    },
    [asignar],
  );

  const { iniciar: arrastrarAlumno, arrastrando, posicion, zona } = useArrastre<Persona>({
    alSoltar: soltarAlumno,
  });

  async function nuevoEquipo() {
    if (equipos.length >= maxEquipos) {
      await avisar({
        titulo: 'No caben más',
        texto: `Una dinámica no puede tener más de ${maxEquipos} equipos: es lo que se lee en la proyección.`,
        icono: 'warning',
      });
      return;
    }
    const nombre = await pedirTexto({
      titulo: 'Nuevo equipo',
      placeholder: `Equipo ${equipos.length + 1}`,
      confirmar: 'Crear',
    });
    if (nombre === null) return;
    await mandar(`${base}/equipos`, 'POST', nombre.trim() ? { nombre: nombre.trim() } : {});
  }

  async function repartir() {
    const respuesta = await pedirTexto({
      titulo: 'Repartir a los que no tienen equipo',
      html: '¿De cuántas personas quieres los equipos?',
      valor: '5',
      confirmar: 'Repartir',
      validar: (v) => {
        const n = Number(v);
        return Number.isInteger(n) && n >= 2 && n <= 10 ? null : 'Escribe un número entre 2 y 10';
      },
    });
    if (!respuesta) return;
    await mandar(`${base}/repartir`, 'POST', { tamano: Number(respuesta) });
  }

  async function borrarEquipo(equipo: EquipoTablero) {
    const ok = await confirmar({
      titulo: `¿Borrar «${equipo.nombre}»?`,
      texto: 'Su tablero y sus historias se van con él. Sus integrantes vuelven a quedar sin equipo.',
      confirmar: 'Borrar',
      peligro: true,
    });
    if (!ok) return;
    await mandar(`${base}/equipos/${equipo.id}`, 'DELETE');
  }

  const enCurso = sprints.find((sp) => sp.id === sprintActual) ?? null;

  async function nuevoSprint() {
    const ok = await confirmar({
      titulo: '¿Abrir el siguiente sprint?',
      texto: 'Los equipos empezarán su planning con el bloqueo que arrastren del anterior.',
      confirmar: 'Abrir sprint',
    });
    if (!ok) return;
    await mandar(`${base}/sprints`, 'POST', {});
  }

  async function cerrarSprintActual() {
    if (!enCurso) return;
    const pendientes = equipos.reduce((t, e) => t + e.historias.filter(
      (h) => h.columna !== 'backlog' && h.columna !== 'done',
    ).length, 0);
    const ok = await confirmar({
      titulo: `¿Cerrar el Sprint ${enCurso.numero}?`,
      html: `Lo terminado pasa a <strong>Archived</strong> y lo que quede abierto —hoy `
        + `<strong>${pendientes}</strong> ${pendientes === 1 ? 'historia' : 'historias'}— se `
        + 'convierte en bloqueo, junto con las penalizaciones que hayas anotado.',
      confirmar: 'Cerrar sprint',
    });
    if (!ok) return;
    await mandar(`${base}/sprints/${enCurso.id}/cerrar`, 'POST', { penalizaciones });
    setPenalizaciones({});
  }

  async function editarObjetivoSprint() {
    if (!enCurso) return;
    const valor = await pedirTexto({
      titulo: `Objetivo del Sprint ${enCurso.numero}`,
      html: 'Es el mismo para todos los equipos, como en la dinámica.',
      valor: enCurso.objetivo,
      placeholder: 'Trabajar contra tiempo',
      confirmar: 'Guardar',
    });
    if (valor === null) return;
    await mandar(`${base}/sprints/${enCurso.id}`, 'PUT', { objetivo: valor });
  }

  async function finalizar() {
    const ok = await confirmar({
      titulo: '¿Finalizar la dinámica?',
      texto: 'Los tableros dejan de tocarse y cada equipo pasa a ver su resumen: qué cerró, qué le faltó y cuánta deuda arrastró.',
      confirmar: 'Finalizar',
      peligro: true,
    });
    if (!ok) return;
    await mandar(`${base}/finalizar`, 'POST', {});
  }

  function ajustarPenalizacion(equipoId: string, delta: number) {
    setPenalizaciones((previas) => ({
      ...previas,
      [equipoId]: Math.max(0, (previas[equipoId] ?? 0) + delta),
    }));
  }

  function abrirProyeccion() {
    const ids = [...proyectados];
    if (ids.length === 0) return;
    window.open(
      `/admin/grupos/${grupoId}/scrum/${dinamicaId}/proyeccion?equipos=${ids.join(',')}`,
      '_blank',
      'noopener',
    );
    setMandoAbierto(false);
  }

  /**
   * Cambia la etapa de ESTA dinámica.
   *
   * No pasa por `mandar`: no toca el reparto, se pinta optimista y no tiene por
   * qué congelar la pantalla —el profesor puede querer corregirse y pulsar otra
   * enseguida—. El servidor no devuelve nada más que confirmarla, así que
   * tampoco se recarga el detalle.
   */
  async function cambiarEtapa(etapaId: string | null) {
    if (!dinamica || aplicandoEtapa) return;
    setAplicandoEtapa(etapaId ?? 'ninguna');
    const previa = dinamica.etapaActual ?? null;
    setDinamica((d) => (d
      ? { ...d, etapaActual: etapaId ? etapas.find((e) => e.id === etapaId) ?? null : null }
      : d));
    try {
      const r = await fetch(`${base}/etapa`, {
        method: 'PUT',
        headers: cabeceras(),
        body: JSON.stringify({ etapaId }),
      });
      if (!r.ok) {
        const json = await r.json().catch(() => ({}));
        setDinamica((d) => (d ? { ...d, etapaActual: previa } : d));
        await avisar({ titulo: 'No se pudo', texto: json?.message ?? 'Inténtalo de nuevo', icono: 'error' });
      }
    } catch {
      setDinamica((d) => (d ? { ...d, etapaActual: previa } : d));
      await avisar({ titulo: 'Sin conexión', texto: 'No se pudo contactar al servidor', icono: 'error' });
    } finally {
      setAplicandoEtapa(null);
    }
  }

  if (cargando) return <p className={styles.cargando}>Cargando…</p>;

  const rejilla = rejillaProyeccion(proyectados.size);

  return (
    <div className={styles.page} aria-busy={enVuelo}>
      {enVuelo && (
        <div className={velo ? `${styles.velo} ${styles.veloVisible}` : styles.velo}>
          <div className={styles.veloCaja}>
            <span className={styles.girando} />
            Guardando…
          </div>
        </div>
      )}
      <header className={styles.header}>
        <div className={styles.tituloCaja}>
          <button
            type="button"
            className={styles.volver}
            onClick={() => navigate(`/admin/grupos/${grupoId}/scrum`)}
          >
            <span className="material-icons">chevron_left</span>
            Dinámicas
          </button>
          <h1 className={styles.pageTitle}>{dinamica?.nombre ?? 'Dinámica'}</h1>
          <p className={styles.subtitulo}>
            {equipos.length} {equipos.length === 1 ? 'equipo' : 'equipos'} ·{' '}
            {equipos.reduce((t, e) => t + e.miembros.length, 0)} de{' '}
            {equipos.reduce((t, e) => t + e.miembros.length, 0) + sinEquipo.length} alumnos asignados
            {rangoFechas(dinamica?.inicio ?? null, dinamica?.fin ?? null) &&
              ` · ${rangoFechas(dinamica?.inicio ?? null, dinamica?.fin ?? null)}`}
          </p>
        </div>
        <div className={styles.headerAcciones}>
          {/* Dos botones y no uno: las restricciones se consultan tanto como la
              definición de terminado, y escondidas tras un cambiador no las
              encontraba nadie. */}
          <button type="button" className={styles.outline} onClick={() => setReglas('done')}>
            <span className="material-icons">check_circle</span>
            Terminado
          </button>
          <button type="button" className={styles.outline} onClick={() => setReglas('restricciones')}>
            <span className="material-icons">rule</span>
            Restricciones
          </button>
          <button
            type="button"
            className={styles.outline}
            onClick={() => setMandoAbierto(true)}
            disabled={equipos.length === 0}
          >
            <span className="material-icons">present_to_all</span>
            Proyectar
          </button>
          <button type="button" className={styles.primario} onClick={nuevoEquipo}>
            <span className="material-icons">add</span>
            Nuevo equipo
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.error} onClick={() => setError(null)} role="alert">
          {error}
        </div>
      )}

      {etapas.length > 0 && (
        <BarraEtapasScrum
          etapas={etapas}
          etapaActualId={dinamica?.etapaActual?.id ?? null}
          aplicando={aplicandoEtapa}
          deshabilitada={!dinamica || dinamica.cerrada}
          nota={dinamica?.cerrada
            ? 'La dinámica está cerrada'
            : 'La ven todos los equipos de esta dinámica'}
          onCambiar={(id) => void cambiarEtapa(id)}
        />
      )}

      <div className={styles.tabs}>
        {(['equipos', 'tableros', 'sprints'] as const).map((v) => (
          <button
            key={v}
            type="button"
            className={`${styles.tab} ${vista === v ? styles.tabActiva : ''}`}
            onClick={() => setVista(v)}
          >
            {v === 'equipos' ? 'Equipos' : v === 'tableros' ? 'Tableros' : 'Sprints y marcador'}
          </button>
        ))}
      </div>

      {vista === 'sprints' ? (
        <SprintsYMarcador
          enVuelo={enVuelo}
          sprints={sprints}
          enCurso={enCurso}
          equipos={equipos}
          marcadores={marcadores}
          penalizaciones={penalizaciones}
          finalizada={dinamica?.finalizada === true}
          onNuevo={nuevoSprint}
          onCerrar={cerrarSprintActual}
          onObjetivo={editarObjetivoSprint}
          onFinalizar={finalizar}
          onPenalizacion={ajustarPenalizacion}
        />
      ) : vista === 'equipos' ? (
        <div className={styles.reparto}>
          <aside className={styles.pool}>
            <div className={styles.poolCabecera}>
              <span className={styles.etiqueta}>Sin equipo</span>
              <span className={sinEquipo.length ? styles.pendientes : styles.todosDentro}>
                {sinEquipo.length}
              </span>
            </div>

            <input
              className={styles.buscador}
              placeholder="Buscar alumno…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />

            <ul className={styles.listaAlumnos}>
              {filtrados.map((a) => (
                <li key={a.id}>
                  <label
                    className={[
                      styles.alumno,
                      marcados.has(a.id) ? styles.alumnoMarcado : '',
                      arrastrando?.id === a.id ? styles.alumnoAtenuado : '',
                    ].filter(Boolean).join(' ')}
                    onPointerDown={arrastrarAlumno(a)}
                  >
                    <input
                      type="checkbox"
                      checked={marcados.has(a.id)}
                      onChange={() => alternarMarcado(a.id)}
                    />
                    <span className={styles.avatar}>{iniciales(a.name)}</span>
                    <span className={styles.alumnoTextos}>
                      <span className={styles.alumnoNombre}>{a.name}</span>
                      <span className={styles.alumnoMatricula}>{a.matricula}</span>
                    </span>
                  </label>
                </li>
              ))}
              {filtrados.length === 0 && (
                <li className={styles.poolVacio}>
                  {sinEquipo.length === 0 ? 'Todos tienen equipo.' : 'Nadie coincide con la búsqueda.'}
                </li>
              )}
            </ul>

            {marcados.size > 0 && (
              <div className={styles.seleccion}>
                <span className={styles.seleccionTexto}>
                  {marcados.size} {marcados.size === 1 ? 'seleccionado' : 'seleccionados'}
                </span>
                <select
                  className={styles.asignarA}
                  value=""
                  onChange={(e) => e.target.value && void asignar(e.target.value, [...marcados])}
                >
                  <option value="">Asignar a…</option>
                  {equipos.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {sinEquipo.length > 0 && (
              <button type="button" className={styles.repartir} onClick={repartir}>
                <span className="material-icons">auto_fix_high</span>
                Repartir automáticamente
              </button>
            )}

            <p className={styles.pista}>
              Arrastra un alumno a un equipo, o marca varios y usa <strong>Asignar a…</strong>
            </p>
          </aside>

          <div className={styles.equipos}>
            {equipos.map((equipo) => (
              <article
                key={equipo.id}
                data-zona={equipo.id}
                className={`${styles.equipo} ${
                  arrastrando && zona === equipo.id ? styles.equipoDestino : ''
                }`}
              >
                <header className={styles.equipoCabecera}>
                  <label className={styles.color} style={{ background: equipo.color }}>
                    <input
                      type="color"
                      className={styles.colorOculto}
                      value={equipo.color}
                      onChange={(e) =>
                        void mandar(`${base}/equipos/${equipo.id}`, 'PUT', { color: e.target.value })}
                      aria-label={`Color de ${equipo.nombre}`}
                    />
                  </label>
                  <input
                    className={styles.equipoNombre}
                    defaultValue={equipo.nombre}
                    maxLength={60}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== equipo.nombre) {
                        void mandar(`${base}/equipos/${equipo.id}`, 'PUT', { nombre: v });
                      } else {
                        e.target.value = equipo.nombre;
                      }
                    }}
                  />
                  <span className={styles.cuenta}>{equipo.miembros.length}</span>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => borrarEquipo(equipo)}
                    title={`Borrar ${equipo.nombre}`}
                  >
                    <span className="material-icons">delete</span>
                  </button>
                </header>

                <ul className={styles.miembros}>
                  {equipo.miembros.map((m) => (
                    <li key={m.id} className={styles.miembro}>
                      <span className={styles.avatar}>{iniciales(m.name)}</span>
                      <span className={styles.miembroNombre}>{m.name}</span>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() =>
                          void mandar(`${base}/equipos/${equipo.id}/miembros/${m.id}`, 'DELETE')}
                        title="Sacar del equipo"
                      >
                        <span className="material-icons">close</span>
                      </button>
                    </li>
                  ))}
                  {equipo.miembros.length === 0 && (
                    <li className={styles.equipoVacio}>Arrastra a alguien aquí</li>
                  )}
                </ul>
              </article>
            ))}

            {equipos.length === 0 && (
              <div className={styles.apagado}>
                <span className="material-icons">groups</span>
                <p>Esta dinámica todavía no tiene equipos.</p>
                <span className={styles.hint}>
                  Crea uno a mano o reparte de golpe a quienes no tienen.
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.tableros}>
          {equipos.map((equipo) => (
            <section key={equipo.id} className={styles.tableroCaja}>
              <header className={styles.tableroCabecera}>
                <span className={styles.punto} style={{ background: equipo.color }} />
                <span className={styles.tableroNombre}>{equipo.nombre}</span>
                <span className={styles.tableroMiembros}>
                  {equipo.miembros.length} {equipo.miembros.length === 1 ? 'integrante' : 'integrantes'}
                </span>
              </header>
              {/* Solo lectura: el tablero es del equipo. El profesor mira, no
                  mueve las tarjetas de nadie. */}
              <TableroScrum equipo={equipo} escala="full" objetivo={enCurso?.objetivo ?? ''} />
            </section>
          ))}
          {equipos.length === 0 && <p className={styles.hint}>Todavía no hay equipos que enseñar.</p>}
        </div>
      )}

      {arrastrando && posicion && (
        <div
          className={styles.fantasmaAlumno}
          style={{ transform: `translate(${posicion.x - 90}px, ${posicion.y - 20}px)` }}
        >
          <span className={styles.avatar}>{iniciales(arrastrando.name)}</span>
          <span className={styles.alumnoNombre}>{arrastrando.name}</span>
        </div>
      )}

      <ReglasScrumModal
        abierto={reglas !== null}
        tipo={reglas ?? 'done'}
        items={reglas === 'restricciones'
          ? dinamica?.restricciones ?? []
          : dinamica?.definicionDone ?? []}
        editable
        onGuardar={(items) =>
          void mandar(`${base}/reglas`, 'PUT',
            reglas === 'restricciones' ? { restricciones: items } : { definicionDone: items })}
        onCerrar={() => setReglas(null)}
      />

      {mandoAbierto && (
        <div className={styles.mandoFondo} onClick={() => setMandoAbierto(false)}>
          <div className={styles.mando} onClick={(e) => e.stopPropagation()}>
            <header className={styles.mandoCabecera}>
              <h2>Proyectar tableros</h2>
              <p>
                Elige qué equipos se ven. La pantalla se abre en otra pestaña y se refresca sola
                conforme los equipos mueven sus tarjetas.
              </p>
            </header>

            <div className={styles.mandoCuerpo}>
              <ul className={styles.mandoLista}>
                {equipos.map((e) => (
                  <li key={e.id}>
                    <label className={`${styles.mandoEquipo} ${proyectados.has(e.id) ? styles.mandoElegido : ''}`}>
                      <input
                        type="checkbox"
                        checked={proyectados.has(e.id)}
                        onChange={() =>
                          setProyectados((previos) => {
                            const copia = new Set(previos);
                            if (copia.has(e.id)) copia.delete(e.id);
                            else copia.add(e.id);
                            return copia;
                          })}
                      />
                      <span className={styles.punto} style={{ background: e.color }} />
                      <span className={styles.mandoNombre}>{e.nombre}</span>
                      <span className={styles.mandoCuenta}>{e.miembros.length}</span>
                    </label>
                  </li>
                ))}
              </ul>

              <div className={styles.mandoPrevia}>
                <span className={styles.etiqueta}>Así se reparte la pantalla</span>
                <div
                  className={styles.rejilla}
                  style={{
                    gridTemplateColumns: `repeat(${rejilla.cols}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${rejilla.filas}, minmax(0, 1fr))`,
                  }}
                >
                  {equipos
                    .filter((e) => proyectados.has(e.id))
                    .map((e) => (
                      <div key={e.id} className={styles.rejillaCelda}>
                        <span className={styles.punto} style={{ background: e.color }} />
                        <span className={styles.rejillaNombre}>{e.nombre}</span>
                      </div>
                    ))}
                </div>
                <p className={styles.pista}>
                  1 equipo ocupa la pantalla entera · 2 y 3 van en una fila · 4 en 2 × 2 · 5 y 6 en
                  3 × 2 · de 7 a 9 en 3 × 3.
                </p>
              </div>
            </div>

            <footer className={styles.mandoPie}>
              <span className={styles.pista}>
                {proyectados.size} {proyectados.size === 1 ? 'equipo elegido' : 'equipos elegidos'}
              </span>
              <div className={styles.mandoBotones}>
                <button type="button" className={styles.outline} onClick={() => setMandoAbierto(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className={styles.primario}
                  onClick={abrirProyeccion}
                  disabled={proyectados.size === 0}
                >
                  <span className="material-icons">open_in_new</span>
                  Abrir proyección
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Las iteraciones y el marcador.
 *
 * El contador de penalizaciones es lo que hace que la deuda técnica exista: el
 * PO de cada equipo canta en el review cuántas restricciones no cumplieron y el
 * profesor las teclea aquí. No se deducen solas — comprobar si un modelo mide
 * más de diez centímetros es justo lo que un sistema no puede hacer — y hasta
 * que se cierra el sprint son un borrador.
 */
function SprintsYMarcador({
  sprints, enCurso, equipos, marcadores, penalizaciones, finalizada, enVuelo,
  onNuevo, onCerrar, onObjetivo, onFinalizar, onPenalizacion,
}: {
  enVuelo: boolean;
  sprints: Sprint[];
  enCurso: Sprint | null;
  equipos: EquipoTablero[];
  marcadores: Marcador[];
  penalizaciones: Record<string, number>;
  finalizada: boolean;
  onNuevo: () => void;
  onCerrar: () => void;
  onObjetivo: () => void;
  onFinalizar: () => void;
  onPenalizacion: (equipoId: string, delta: number) => void;
}) {
  const porEquipo = new Map(marcadores.map((m) => [m.equipo ?? '', m]));

  return (
    <div className={styles.sprints}>
      <section className={styles.iteraciones}>
        <span className={styles.etiqueta}>Iteraciones</span>
        <div className={styles.fichasSprint}>
          {sprints.map((sp) => (
            <span
              key={sp.id}
              className={[
                styles.fichaSprint,
                sp.id === enCurso?.id ? styles.fichaActiva : '',
                sp.cerrado ? styles.fichaCerrada : '',
              ].filter(Boolean).join(' ')}
            >
              {sp.cerrado && <span className="material-icons">check</span>}
              Sprint {sp.numero}
              {sp.id === enCurso?.id && ' · en curso'}
            </span>
          ))}
          {!finalizada && (
            <button type="button" className={styles.nuevoSprint} onClick={onNuevo} disabled={enVuelo}>
              <span className="material-icons">{enVuelo ? 'hourglass_empty' : 'add'}</span>
              Nuevo sprint
            </button>
          )}
        </div>

        {enCurso && (
          <div className={styles.objetivoSprint}>
            <span className={styles.etiqueta}>Objetivo del Sprint {enCurso.numero}</span>
            <button type="button" className={styles.objetivoBtn} onClick={onObjetivo}>
              <span className={enCurso.objetivo ? styles.objetivoTexto : styles.objetivoVacio}>
                {enCurso.objetivo || 'Sin definir'}
              </span>
              <span className="material-icons">edit</span>
            </button>
            <span className={styles.pista}>lo ven los equipos, no lo editan</span>
          </div>
        )}
      </section>

      <table className={styles.tabla}>
        <thead>
          <tr>
            <th>Equipo</th>
            <th className={styles.colCorta}>Cerrado</th>
            <th className={styles.colCorta}>Sin terminar</th>
            <th className={styles.colPen}>Penalizaciones · las reporta el PO</th>
            <th className={styles.colCorta}>Bloqueo</th>
          </tr>
        </thead>
        <tbody>
          {equipos.map((e) => {
            const marcador = porEquipo.get(e.id);
            const abiertas = e.historias.filter(
              (h) => h.columna !== 'backlog' && h.columna !== 'done',
            );
            const abiertosPts = abiertas.reduce((t, h) => t + Math.max(0, h.puntos), 0);
            const cerrados = e.historias
              .filter((h) => h.columna === 'done')
              .reduce((t, h) => t + Math.max(0, h.puntos), 0);
            const pen = penalizaciones[e.id] ?? 0;
            const bloqueo = abiertosPts + pen;
            return (
              <tr key={e.id}>
                <td>
                  <span className={styles.equipoCelda}>
                    <span className={styles.punto} style={{ background: e.color }} />
                    {e.nombre}
                  </span>
                  {e.bloqueoPendiente > 0 && (
                    <span className={styles.arrastra}>
                      arrastra {e.bloqueoPendiente} pts del sprint anterior
                    </span>
                  )}
                </td>
                <td>{marcador?.cerrados || cerrados} pts</td>
                <td>{abiertas.length} HU · {abiertosPts} pts</td>
                <td>
                  <span className={styles.contadorPen}>
                    <button type="button" className={styles.iconBtn} onClick={() => onPenalizacion(e.id, -1)}>
                      <span className="material-icons">remove</span>
                    </button>
                    <span className={pen > 0 ? styles.penValor : styles.penCero}>{pen}</span>
                    <button type="button" className={styles.iconBtn} onClick={() => onPenalizacion(e.id, 1)}>
                      <span className="material-icons">add</span>
                    </button>
                  </span>
                </td>
                <td>
                  <span className={bloqueo > 0 ? styles.bloqueoMal : styles.bloqueoBien}>
                    {bloqueo > 0 ? `${bloqueo} pts` : 'sin deuda'}
                  </span>
                </td>
              </tr>
            );
          })}
          {equipos.length === 0 && (
            <tr><td colSpan={5} className={styles.hint}>Todavía no hay equipos.</td></tr>
          )}
        </tbody>
      </table>

      <p className={styles.explicacion}>
        <strong>Bloqueo</strong> = puntos de las historias que no se cerraron + una por cada
        restricción incumplida. Al cerrar el sprint, lo terminado pasa a <strong>Archived</strong>,
        lo abierto se queda donde está, y en el planning del siguiente el sistema devuelve al
        backlog historias al azar hasta cubrirlo.
      </p>

      {!finalizada && (
        <div className={styles.accionesSprint}>
          <button
            type="button"
            className={styles.outline}
            onClick={onCerrar}
            disabled={!enCurso || equipos.length === 0 || enVuelo}
          >
            <span className="material-icons">{enVuelo ? 'hourglass_empty' : 'lock'}</span>
            {enVuelo ? 'Cerrando…' : `Cerrar ${enCurso ? `Sprint ${enCurso.numero}` : 'sprint'}`}
          </button>
          <button type="button" className={styles.primario} onClick={onFinalizar} disabled={enVuelo}>
            <span className="material-icons">check_circle</span>
            Finalizar dinámica
          </button>
        </div>
      )}
    </div>
  );
}
