import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import { avisar, confirmar, pedirTexto } from '../../../../utils/dialogos';
import { LARGO_NOMBRE, rangoFechas, type FilaScrum } from '../../../../utils/scrum';
import styles from './MisScrumPage.module.css';

const API = '/api';

/**
 * La pantalla de entrada del alumno al módulo de Scrum.
 *
 * Antes esto no existía: el menú llevaba directo al tablero, porque solo había
 * uno. Ahora hay dos cosas que mirar —lo que se jugó en clase y lo que el
 * alumno practica por su cuenta— y hacen falta las dos en un sitio: el ejercicio
 * de clase se ve una vez y se olvida, y sin poder volver a él, el resumen y el
 * burndown que se hicieron no le sirven a nadie después.
 *
 * La dinámica de clase VIVA va primero y destacada. Es lo que se busca en mitad
 * de la sesión, y ahí un clic de más son treinta personas esperando.
 */
export default function MisScrumPage() {
  const { grupoId } = useParams<{ grupoId: string }>();
  const { sessionToken, user } = useAuth();
  const navegar = useNavigate();

  const [clase, setClase] = useState<FilaScrum[]>([]);
  const [practica, setPractica] = useState<FilaScrum[]>([]);
  const [maxPartidas, setMaxPartidas] = useState(5);
  /** Cuál de las de clase abre el tablero. Lo dice el servidor, no se deduce. */
  const [vigenteId, setVigenteId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Abrir o borrar una partida reordena la lista: hasta que vuelve, no se toca. */
  const [enVuelo, setEnVuelo] = useState(false);

  const base = `${API}/alumno/grupos/${grupoId}/scrum`;

  const cabeceras = useCallback(
    (): HeadersInit => ({
      'Content-Type': 'application/json',
      ...(sessionToken ? { 'x-session-token': sessionToken } : {}),
    }),
    [sessionToken],
  );

  const cargar = useCallback(async () => {
    if (!grupoId) return;
    try {
      const r = await fetch(`${base}/partidas`, { headers: cabeceras() });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.message ?? 'No se pudo cargar');
      setClase(json.clase ?? []);
      setPractica(json.practica ?? []);
      setMaxPartidas(json.maxPartidas ?? 5);
      setVigenteId(json.vigenteId ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }, [base, grupoId, cabeceras]);

  useEffect(() => { void cargar(); }, [cargar]);

  const yoId = user?.id ?? '';
  const mias = practica.filter((p) => p.propietario?.id === yoId);
  const vivas = mias.filter((p) => !p.finalizada).length;
  /**
   * La dinámica de clase que se puede abrir.
   *
   * No siempre es una que esté en curso: cuando el profesor termina la
   * dinámica, el tablero pasa a enseñar el RESUMEN del equipo —qué cerró, qué
   * le faltó, su burndown—, y esa es la pantalla que más se consulta después de
   * la sesión. Cuál es la elige el servidor con la misma función que resuelve el
   * tablero, para que el botón no lleve a una y se abra otra.
   */
  const vigente = clase.find((d) => d.id === vigenteId) ?? null;
  const pasadas = clase.filter((d) => d.id !== vigente?.id);

  async function nuevaPartida() {
    if (vivas >= maxPartidas) {
      await avisar({
        titulo: 'Ya tienes bastantes abiertas',
        texto: `Puedes tener ${maxPartidas} partidas a la vez. Termina o borra alguna para abrir otra.`,
        icono: 'warning',
      });
      return;
    }
    const nombre = await pedirTexto({
      titulo: 'Nueva partida de práctica',
      html: 'Recorrerás el ciclo entero tú: abres las etapas, mueves el tablero y cierras el sprint.',
      placeholder: `Mi práctica ${mias.length + 1}`,
      confirmar: 'Abrir',
      validar: (v) => (v.trim().length > LARGO_NOMBRE ? `Máximo ${LARGO_NOMBRE} caracteres` : null),
    });
    if (nombre === null) return;

    setEnVuelo(true);
    try {
      const r = await fetch(`${base}/partidas`, {
        method: 'POST',
        headers: cabeceras(),
        body: JSON.stringify({ nombre: nombre.trim() || undefined }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.message ?? 'No se pudo abrir');
      navegar(`/alumno/grupos/${grupoId}/scrum/partidas/${json.partida.id}`);
    } catch (e) {
      await avisar({
        titulo: 'No se pudo',
        texto: e instanceof Error ? e.message : 'Inténtalo de nuevo',
        icono: 'error',
      });
      setEnVuelo(false);
    }
  }

  async function renombrarPartida(p: FilaScrum) {
    const nombre = await pedirTexto({
      titulo: 'Renombrar la partida',
      valor: p.nombre,
      confirmar: 'Guardar',
      validar: (v) => {
        if (v.trim() === '') return 'Escribe un nombre';
        return v.trim().length > LARGO_NOMBRE ? `Máximo ${LARGO_NOMBRE} caracteres` : null;
      },
    });
    if (nombre === null) return;
    setEnVuelo(true);
    try {
      const r = await fetch(`${base}/partidas/${p.id}`, {
        method: 'PUT',
        headers: cabeceras(),
        body: JSON.stringify({ nombre: nombre.trim() }),
      });
      if (!r.ok) {
        const json = await r.json().catch(() => ({}));
        throw new Error(json?.message ?? 'No se pudo renombrar');
      }
      setPractica((ps) => ps.map((x) => (x.id === p.id ? { ...x, nombre: nombre.trim() } : x)));
    } catch (e) {
      await avisar({
        titulo: 'No se pudo',
        texto: e instanceof Error ? e.message : 'Inténtalo de nuevo',
        icono: 'error',
      });
    } finally {
      setEnVuelo(false);
    }
  }

  async function borrarPartida(p: FilaScrum) {
    const ok = await confirmar({
      titulo: `¿Borrar «${p.nombre}»?`,
      texto: 'Se va con ella su tablero y todo lo que escribiste. No se puede deshacer.',
      confirmar: 'Borrar',
      peligro: true,
    });
    if (!ok) return;
    setEnVuelo(true);
    try {
      const r = await fetch(`${base}/partidas/${p.id}`, { method: 'DELETE', headers: cabeceras() });
      if (!r.ok) {
        const json = await r.json().catch(() => ({}));
        throw new Error(json?.message ?? 'No se pudo borrar');
      }
      setPractica((ps) => ps.filter((x) => x.id !== p.id));
    } catch (e) {
      await avisar({
        titulo: 'No se pudo',
        texto: e instanceof Error ? e.message : 'Inténtalo de nuevo',
        icono: 'error',
      });
    } finally {
      setEnVuelo(false);
    }
  }

  function irA(destino: string) {
    navegar(`/alumno/grupos/${grupoId}/scrum/${destino}`);
  }

  if (cargando) return <p className={styles.cargando}>Cargando…</p>;

  return (
    <div className={styles.page} aria-busy={enVuelo}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Actividad de Scrum</h1>
          <p className={styles.subtitulo}>
            Aquí está lo que has jugado con tu clase y las partidas que abras por tu cuenta
            para practicar el ciclo a tu paso.
          </p>
        </div>
      </header>

      {error && (
        <div className={styles.error} onClick={() => setError(null)} role="alert">
          {error}
        </div>
      )}

      <section className={styles.bloque}>
        <h2 className={styles.tituloBloque}>Con tu clase</h2>

        {vigente ? (
          /* En grande. Es lo que se busca en mitad de la sesión, y después de
             ella es donde está el resumen del equipo. */
          <button
            type="button"
            className={styles.destacada}
            onClick={() => irA('tablero')}
            disabled={enVuelo}
          >
            <span className={styles.destacadaTexto}>
              <span className={styles.destacadaEtiqueta}>
                {vigente.finalizada ? 'Tu resumen' : 'En curso'}
              </span>
              <span className={styles.destacadaNombre}>{vigente.nombre}</span>
              <span className={styles.destacadaPie}>
                {vigente.sprint ? `Sprint ${vigente.sprint.numero}` : 'Sin sprint'}
                {vigente.miEquipo ? ` · ${vigente.miEquipo.nombre}` : ' · sin equipo todavía'}
              </span>
            </span>
            {vigente.finalizada ? (
              <span className={styles.tagCerrada}>Terminada</span>
            ) : vigente.etapaActual ? (
              <span className={styles.etapaTag} style={{ background: vigente.etapaActual.color }}>
                {vigente.etapaActual.nombre}
              </span>
            ) : (
              <span className={styles.sinEtapa}>Sin etapa abierta</span>
            )}
            <span className="material-icons">chevron_right</span>
          </button>
        ) : (
          <p className={styles.vacio}>Tu profesor todavía no ha abierto ninguna dinámica.</p>
        )}

        {pasadas.length > 0 && (
          <ul className={styles.lista}>
            {pasadas.map((d) => (
              <li key={d.id} className={styles.item}>
                <span className={styles.itemNombre}>{d.nombre}</span>
                <span className={styles.itemDato}>
                  {d.sprint ? `${d.sprint.numero} sprints` : '—'}
                  {rangoFechas(d.inicio, d.fin) && ` · ${rangoFechas(d.inicio, d.fin)}`}
                </span>
                <span className={styles.tagCerrada}>Terminada</span>
              </li>
            ))}
          </ul>
        )}
        {pasadas.length > 0 && (
          /* Sin enlace a propósito: el tablero abre SIEMPRE la de arriba, que es
             la que el servidor da por vigente. Poner un botón en estas sería
             mentir sobre lo que hace. */
          <p className={styles.nota}>
            Las anteriores se conservan para consultarlas en clase.
          </p>
        )}
      </section>

      <section className={styles.bloque}>
        <div className={styles.cabeceraBloque}>
          <h2 className={styles.tituloBloque}>Mis partidas</h2>
          <button
            type="button"
            className={styles.primario}
            onClick={() => void nuevaPartida()}
            disabled={enVuelo}
          >
            <span className="material-icons">add</span>
            Nueva partida
          </button>
        </div>
        <p className={styles.ayuda}>
          Una partida es el mismo Scrum, pero lo conduces tú: abres las etapas, mueves el
          tablero y cierras los sprints. Puedes jugarla solo o invitar a compañeros de tu grupo.
          {' '}Tienes {vivas} de {maxPartidas} abiertas.
        </p>

        {practica.length === 0 ? (
          <p className={styles.vacio}>Todavía no has abierto ninguna.</p>
        ) : (
          <ul className={styles.lista}>
            {practica.map((p) => {
              const mia = p.propietario?.id === yoId;
              return (
                <li key={p.id} className={styles.item}>
                  <button
                    type="button"
                    className={styles.itemBoton}
                    onClick={() => irA(`partidas/${p.id}`)}
                    disabled={enVuelo}
                  >
                    <span className={styles.itemNombre}>{p.nombre}</span>
                    <span className={styles.itemDato}>
                      {p.sprint ? `Sprint ${p.sprint.numero}` : 'Sin sprint'}
                      {' · '}
                      {p.integrantes.length === 1
                        ? 'solo tú'
                        : `${p.integrantes.length} personas`}
                      {!mia && p.propietario && ` · la abrió ${p.propietario.name}`}
                    </span>
                  </button>
                  {p.finalizada ? (
                    <span className={styles.tagCerrada}>Terminada</span>
                  ) : p.etapaActual ? (
                    <span className={styles.etapaTag} style={{ background: p.etapaActual.color }}>
                      {p.etapaActual.nombre}
                    </span>
                  ) : (
                    <span className={styles.sinEtapa}>Sin empezar</span>
                  )}
                  {mia && (
                    <>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => void renombrarPartida(p)}
                        disabled={enVuelo}
                        title="Renombrar la partida"
                        aria-label={`Renombrar ${p.nombre}`}
                      >
                        <span className="material-icons">edit</span>
                      </button>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => void borrarPartida(p)}
                        disabled={enVuelo}
                        title="Borrar la partida"
                        aria-label={`Borrar ${p.nombre}`}
                      >
                        <span className="material-icons">delete</span>
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
