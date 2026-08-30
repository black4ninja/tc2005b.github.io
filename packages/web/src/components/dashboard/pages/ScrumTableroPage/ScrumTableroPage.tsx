import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import TableroScrum from '../../organisms/TableroScrum/TableroScrum';
import HistoriaForm, { type DatosHistoria } from '../../organisms/HistoriaForm/HistoriaForm';
import { avisar, pedirTexto } from '../../../../utils/dialogos';
import { iniciales, type Columna, type Dinamica, type EquipoTablero, type Historia } from '../../../../utils/scrum';
import styles from './ScrumTableroPage.module.css';

const API = '/api';

/** Red de seguridad del stream: si la conexión muere sin avisar, esto lo salva. */
const REFRESCO_MS = 60000;

/**
 * El tablero del alumno.
 *
 * Cinco personas mueven el mismo tablero a la vez, así que la pantalla ESCUCHA
 * en vez de preguntar: quien arrastra una tarjeta la mueve también en la
 * pantalla de sus compañeros. El refresco lento sigue ahí por si la conexión se
 * cae sin avisar, que es lo que pasa con el wifi del aula.
 *
 * La banda de color de arriba la manda el profesor desde su panel y es lo
 * primero que se ve: de lejos se reconoce antes el color que el nombre de la
 * etapa, que es justo lo que hace falta cuando alguien levanta la vista a mitad
 * de un daily.
 */
export default function ScrumTableroPage() {
  const { grupoId } = useParams<{ grupoId: string }>();
  const { sessionToken } = useAuth();

  const [dinamica, setDinamica] = useState<Dinamica | null>(null);
  const [equipo, setEquipo] = useState<EquipoTablero | null>(null);
  const [editable, setEditable] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formAbierto, setFormAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<Historia | null>(null);
  const [guardando, setGuardando] = useState(false);

  const base = `${API}/alumno/grupos/${grupoId}/scrum`;
  const flujo = useRef<EventSource | null>(null);

  const cabeceras = useCallback(
    (): HeadersInit => ({
      'Content-Type': 'application/json',
      ...(sessionToken ? { 'x-session-token': sessionToken } : {}),
    }),
    [sessionToken],
  );

  const aplicar = useCallback((json: any) => {
    setDinamica(json?.dinamica ?? null);
    setEquipo(json?.equipo ?? null);
    setEditable(json?.editable === true);
  }, []);

  const cargar = useCallback(async () => {
    if (!grupoId || !sessionToken) return;
    try {
      const r = await fetch(base, { headers: cabeceras() });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.message ?? 'No se pudo cargar el tablero');
      aplicar(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }, [base, grupoId, sessionToken, cabeceras, aplicar]);

  useEffect(() => { void cargar(); }, [cargar]);

  // El stream. `EventSource` no manda cabeceras propias: la sesión viaja en la
  // cookie que ya existe, nunca en la URL.
  useEffect(() => {
    if (!grupoId || !sessionToken) return;
    const fuente = new EventSource(`${base}/stream`, { withCredentials: true });
    flujo.current = fuente;
    fuente.onmessage = (ev) => {
      try { aplicar(JSON.parse(ev.data)); } catch { /* trama a medias: llega otra */ }
    };
    // Sin `onerror` que cierre: EventSource reconecta solo, y cerrarlo aquí
    // dejaba el tablero congelado tras el primer parpadeo de red.
    return () => { fuente.close(); flujo.current = null; };
  }, [base, grupoId, sessionToken, aplicar]);

  useEffect(() => {
    const t = setInterval(() => { void cargar(); }, REFRESCO_MS);
    return () => clearInterval(t);
  }, [cargar]);

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

  async function guardarHistoria(datos: DatosHistoria) {
    setGuardando(true);
    const ok = enEdicion
      ? await mandar(`${base}/historias/${enEdicion.id}`, 'PUT', datos)
      : await mandar(`${base}/historias`, 'POST', datos);
    setGuardando(false);
    if (ok) {
      setFormAbierto(false);
      setEnEdicion(null);
    }
  }

  /**
   * Mover una tarjeta se pinta ANTES de que conteste el servidor. Es un gesto de
   * arrastrar: si la tarjeta vuelve a su sitio medio segundo y luego salta, se
   * lee como que no funcionó y se repite.
   */
  async function mover(historiaId: string, columna: Columna) {
    setEquipo((previo) =>
      previo
        ? {
            ...previo,
            historias: previo.historias.map((h) => (h.id === historiaId ? { ...h, columna } : h)),
          }
        : previo,
    );
    await mandar(`${base}/historias/${historiaId}`, 'PUT', { columna });
  }

  async function editarObjetivo() {
    const valor = await pedirTexto({
      titulo: 'Objetivo del sprint',
      html: 'Una frase: a qué se compromete el equipo en este sprint.',
      valor: equipo?.objetivo ?? '',
      placeholder: 'Que el usuario pueda…',
      confirmar: 'Guardar',
    });
    if (valor === null) return;
    await mandar(`${base}/objetivo`, 'PUT', { objetivo: valor });
  }

  if (cargando) return <p className={styles.cargando}>Cargando tu tablero…</p>;

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.error} role="alert">{error}</div>
      </div>
    );
  }

  if (!dinamica) {
    return (
      <div className={styles.page}>
        <Apagado
          icono="view_kanban"
          titulo="Todavía no hay ninguna dinámica abierta"
          detalle="Cuando tu profesor abra una y te asigne un equipo, tu tablero aparecerá aquí."
        />
      </div>
    );
  }

  if (!equipo) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>{dinamica.nombre}</h1>
        </header>
        <Apagado
          icono="groups"
          titulo="Todavía no tienes equipo"
          detalle="Tu profesor está armando los equipos de esta dinámica. En cuanto te asigne uno, verás su tablero."
        />
      </div>
    );
  }

  const etapa = dinamica.etapaActual;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>{equipo.nombre}</h1>
          <p className={styles.subtitulo}>{dinamica.nombre}</p>
        </div>
        <div className={styles.miembros} title={equipo.miembros.map((m) => m.name).join(', ')}>
          {equipo.miembros.map((m) => (
            <span key={m.id} className={styles.avatar}>{iniciales(m.name)}</span>
          ))}
        </div>
      </header>

      {/* La única zona de color saturado de la pantalla, y a propósito: es lo que
          se lee de un vistazo desde el otro lado del salón. */}
      {etapa ? (
        <div className={styles.banda} style={{ background: etapa.color }}>
          <div className={styles.bandaTitulo}>
            <span className={styles.bandaEtiqueta}>Etapa en curso</span>
            <span className={styles.bandaNombre}>{etapa.nombre}</span>
          </div>
          {/* Qué hay que hacer AHORA. Va aquí y no en un manual aparte: es lo
              que se lee cuando alguien levanta la vista a mitad de la sesión y
              no se acuerda de en qué momento del ciclo va la clase. */}
          {etapa.pista && <p className={styles.bandaPista}>{etapa.pista}</p>}
          <span className={styles.bandaNota}>La cambia el profesor</span>
        </div>
      ) : (
        <div className={styles.bandaVacia}>El profesor todavía no ha señalado ninguna etapa.</div>
      )}

      {dinamica.cerrada && (
        <div className={styles.cerrada} role="status">
          Esta dinámica está cerrada: el tablero se puede consultar, pero ya no se toca.
        </div>
      )}

      <TableroScrum
        equipo={equipo}
        escala="full"
        editable={editable}
        onNuevaHistoria={() => { setEnEdicion(null); setFormAbierto(true); }}
        onAbrirHistoria={(h) => { setEnEdicion(h); setFormAbierto(true); }}
        onMover={mover}
        onEditarObjetivo={editarObjetivo}
      />

      <HistoriaForm
        abierto={formAbierto}
        historia={enEdicion}
        miembros={equipo.miembros}
        guardando={guardando}
        onGuardar={guardarHistoria}
        onBorrar={async (id) => {
          const ok = await mandar(`${base}/historias/${id}`, 'DELETE');
          if (ok) { setFormAbierto(false); setEnEdicion(null); }
        }}
        onCerrar={() => { setFormAbierto(false); setEnEdicion(null); }}
      />
    </div>
  );
}

function Apagado({ icono, titulo, detalle }: { icono: string; titulo: string; detalle: string }) {
  return (
    <div className={styles.apagado}>
      <span className="material-icons">{icono}</span>
      <p className={styles.apagadoTitulo}>{titulo}</p>
      <span className={styles.hint}>{detalle}</span>
    </div>
  );
}
