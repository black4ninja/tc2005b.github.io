import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import TableroScrum from '../../organisms/TableroScrum/TableroScrum';
import { avisar, confirmar, pedirTexto } from '../../../../utils/dialogos';
import {
  iniciales, rangoFechas, rejillaProyeccion,
  type Dinamica, type EquipoTablero, type Persona,
} from '../../../../utils/scrum';
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

  const [vista, setVista] = useState<'equipos' | 'tableros'>('equipos');
  const [busqueda, setBusqueda] = useState('');
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [mandoAbierto, setMandoAbierto] = useState(false);
  const [proyectados, setProyectados] = useState<Set<string>>(new Set());

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
      setEquipos(json.equipos ?? []);
      setSinEquipo(json.sinEquipo ?? []);
      setMaxEquipos(json.maxEquipos ?? 9);
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

  const mandar = useCallback(
    async (url: string, metodo: string, cuerpo?: unknown): Promise<boolean> => {
      try {
        const r = await fetch(url, {
          method: metodo,
          headers: cabeceras(),
          body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
        });
        const json = await r.json().catch(() => ({}));
        if (!r.ok) {
          await avisar({ titulo: 'No se pudo', texto: json?.message ?? 'Inténtalo de nuevo', icono: 'error' });
          return false;
        }
        await cargar();
        return true;
      } catch {
        await avisar({ titulo: 'Sin conexión', texto: 'No se pudo contactar al servidor', icono: 'error' });
        return false;
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

  async function asignar(equipoId: string, alumnoIds: string[]) {
    if (alumnoIds.length === 0) return;
    const ok = await mandar(`${base}/equipos/${equipoId}/miembros`, 'POST', { alumnoIds });
    if (ok) setMarcados(new Set());
  }

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

  function soltarEnEquipo(e: DragEvent<HTMLElement>, equipoId: string) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/alumno');
    if (id) void asignar(equipoId, [id]);
  }

  if (cargando) return <p className={styles.cargando}>Cargando…</p>;

  const rejilla = rejillaProyeccion(proyectados.size);

  return (
    <div className={styles.page}>
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
          {dinamica?.etapaActual && (
            <span className={styles.etapaTag} style={{ background: dinamica.etapaActual.color }}>
              {dinamica.etapaActual.nombre}
            </span>
          )}
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

      <div className={styles.tabs}>
        {(['equipos', 'tableros'] as const).map((v) => (
          <button
            key={v}
            type="button"
            className={`${styles.tab} ${vista === v ? styles.tabActiva : ''}`}
            onClick={() => setVista(v)}
          >
            {v === 'equipos' ? 'Equipos' : 'Tableros'}
          </button>
        ))}
      </div>

      {vista === 'equipos' ? (
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
                    className={`${styles.alumno} ${marcados.has(a.id) ? styles.alumnoMarcado : ''}`}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/alumno', a.id)}
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
                className={styles.equipo}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => soltarEnEquipo(e, equipo.id)}
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
              <TableroScrum equipo={equipo} escala="full" />
            </section>
          ))}
          {equipos.length === 0 && <p className={styles.hint}>Todavía no hay equipos que enseñar.</p>}
        </div>
      )}

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
