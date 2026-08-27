import { useState, useEffect, useRef } from 'react';
import { useParams, Navigate, useLocation } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import PreguntaProyector from '../../organisms/PreguntaProyector/PreguntaProyector';
import { faseProyeccion } from '../../../../utils/preguntas';
import type { Proyeccion } from '../../../../types/preguntas';
import styles from './ProyeccionPage.module.css';

const API_BASE = '/api';
/**
 * Red de seguridad, no la vía normal: los cambios llegan empujados por el
 * stream. Esto solo cubre que el stream se caiga sin avisar o que algún día el
 * API corra en más de una instancia, así que va MUY espaciado.
 */
const PERIODO_SONDEO = 20000;
/** Cada cuánto se repinta el reloj. Más fino que el segundo para que no salte. */
const PERIODO_RELOJ = 200;
/** Fallos seguidos antes de avisar. Uno suelto es un bache, no una desconexión. */
const FALLOS_PARA_AVISAR = 3;

/**
 * La pantalla que se proyecta, en su propia pestaña.
 *
 * Va aparte del panel —y fuera del layout del dashboard— porque el sitio donde
 * se ve no es el sitio desde donde se maneja: esta pestaña se abre en el iPad
 * del alumno o en el cañón del aula, y el profesor la dirige desde su panel.
 * Por eso no hay controles ni menú: aquí solo se lee.
 *
 * Lo que se enseña sale de un sondeo al servidor. El reloj NO viaja: llega el
 * instante en que se pulsó «Iniciar» y aquí se calcula lo que queda, corrigiendo
 * el desfase entre este reloj y el del servidor. Así entrar a mitad enseña el
 * número correcto y dos pantallas abiertas enseñan el mismo.
 */
export default function ProyeccionPage() {
  const { id: grupoId } = useParams();
  const { sessionToken, isAuthenticated, isLoading } = useAuth();
  const { pathname } = useLocation();

  const [proyeccion, setProyeccion] = useState<Proyeccion | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const [fallos, setFallos] = useState(0);
  /** `serverNow - Date.now()`: los dos aparatos no tienen la misma hora. */
  const desfaseRef = useRef(0);

  useEffect(() => { document.title = 'Proyección | Preguntas'; }, []);

  useEffect(() => {
    if (!grupoId || !sessionToken) return;
    let vivo = true;

    function aplicar(data: { proyeccion?: Proyeccion; serverNow?: string }) {
      if (!vivo) return;
      if (data.serverNow) desfaseRef.current = new Date(data.serverNow).getTime() - Date.now();
      setProyeccion(data.proyeccion ?? null);
      setFallos(0);
    }

    async function sondear() {
      try {
        const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/preguntas/proyeccion`, {
          headers: { 'x-session-token': sessionToken ?? '' },
        });
        if (!res.ok) throw new Error('sondeo');
        aplicar(await res.json());
      } catch {
        if (vivo) setFallos((n) => n + 1);
      }
    }

    /**
     * El camino normal: el servidor EMPUJA. Preguntar una vez por segundo
     * costaba validar la sesión, comprobar el acceso y leer la fila —casi un
     * segundo contra la base— para casi siempre oír «no ha cambiado nada», y al
     * pulsar «Iniciar» el alumno lo veía hasta dos segundos después.
     *
     * `EventSource` no admite cabeceras, así que la sesión viaja en la cookie
     * —la misma que ya usan las navegaciones normales— y no en la URL. Si falla,
     * se reconecta solo, y por debajo sigue el sondeo lento de red de seguridad.
     */
    const fuente = new EventSource(
      `${API_BASE}/admin/grupos/${grupoId}/preguntas/proyeccion/stream`,
      { withCredentials: true },
    );
    fuente.onmessage = (e) => {
      try { aplicar(JSON.parse(e.data)); } catch { /* trozo suelto: llegará otro */ }
    };
    fuente.onerror = () => { if (vivo) setFallos((n) => n + 1); };

    sondear();
    const id = window.setInterval(sondear, PERIODO_SONDEO);
    // Volver a la pestaña sondea EN EL ACTO. El navegador frena los temporizadores
    // de las pestañas de fondo y puede haber suspendido el stream; sin esto la
    // pantalla del aula parecería colgada justo cuando se la mira.
    function alVolver() { if (document.visibilityState === 'visible') sondear(); }
    document.addEventListener('visibilitychange', alVolver);

    return () => {
      vivo = false;
      fuente.close();
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [grupoId, sessionToken]);

  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), PERIODO_RELOJ);
    return () => window.clearInterval(id);
  }, []);

  if (isLoading) return <div className={styles.aviso}>Cargando…</div>;
  // Esta ruta vive fuera del layout del dashboard, así que se guarda sola. En el
  // iPad basta con iniciar sesión una vez.
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: pathname }} />;

  if (!proyeccion) {
    return <div className={styles.aviso}>Conectando con el panel…</div>;
  }

  const { fase, restante, visible } = faseProyeccion(proyeccion, ahora + desfaseRef.current);

  return (
    <PreguntaProyector
      alumno={proyeccion.alumno}
      competencia={proyeccion.competencia}
      textoHtml={proyeccion.textoHtml ?? ''}
      fase={fase}
      restante={restante}
      duracionSegundos={proyeccion.duracionSegundos}
      visible={visible}
      sinConexion={fallos >= FALLOS_PARA_AVISAR}
    />
  );
}
