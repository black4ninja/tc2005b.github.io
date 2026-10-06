import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import styles from './AsesoriaVisorPage.module.css';
import '../../../../styles/contenido-render.css';

const API_BASE = '/api';
/** Cada cuánto se mira si el profesor apagó el visor o cambió la pregunta. */
const PERIODO_SONDEO = 10000;

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'cerrado' }
  | { tipo: 'listo'; textoHtml: string; competencia: string | null };

/**
 * El visor de ASESORÍA, el que abre el alumno al escanear el QR.
 *
 * Sin sesión, sin menú y sin reloj: es para practicar, no una entrevista. Solo
 * la pregunta, grande y legible en el teléfono o en una pantalla. Mira cada
 * pocos segundos si sigue encendido, para que al apagarlo el profesor la
 * pregunta desaparezca también de las pantallas que ya lo tenían abierto.
 */
export default function AsesoriaVisorPage() {
  const { token } = useParams<{ token: string }>();
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });

  useEffect(() => {
    let vivo = true;
    async function leer() {
      try {
        const res = await fetch(`${API_BASE}/publico/asesoria/${encodeURIComponent(token ?? '')}`);
        if (!vivo) return;
        if (res.status === 404) { setEstado({ tipo: 'cerrado' }); return; }
        if (!res.ok) return; // un fallo de red no cierra el visor: se reintenta
        const data = await res.json() as { pregunta?: { textoHtml: string; competencia: string | null } };
        if (vivo && data.pregunta) {
          setEstado({ tipo: 'listo', textoHtml: data.pregunta.textoHtml, competencia: data.pregunta.competencia });
        }
      } catch {
        // Sin conexión: se queda lo que había y se reintenta.
      }
    }
    void leer();
    const id = window.setInterval(leer, PERIODO_SONDEO);
    return () => { vivo = false; window.clearInterval(id); };
  }, [token]);

  if (estado.tipo === 'cargando') {
    return <div className={styles.pagina}><p className={styles.aviso}>Cargando la pregunta…</p></div>;
  }
  if (estado.tipo === 'cerrado') {
    return (
      <div className={styles.pagina}>
        <div className={styles.cerrado}>
          <span className={styles.cerradoIcono} aria-hidden="true">⏹</span>
          <p className={styles.aviso}>Este visor ya no está activo.</p>
          <p className={styles.avisoChico}>Pídele a tu profesor un enlace nuevo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pagina}>
      <header className={styles.barra}>
        <span className={styles.etiqueta}>Práctica de asesoría</span>
        {estado.competencia && <span className={styles.competencia}>{estado.competencia}</span>}
      </header>
      <main className={styles.escena}>
        <div
          className={`${styles.texto} contenido-render`}
          dangerouslySetInnerHTML={{ __html: estado.textoHtml }}
        />
      </main>
    </div>
  );
}
