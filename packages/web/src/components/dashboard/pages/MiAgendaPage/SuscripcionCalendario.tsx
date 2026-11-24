import { useEffect, useState } from 'react';
import Modal from '../../atoms/Modal/Modal';
import Icon from '../../atoms/Icon/Icon';
import { useAuth } from '../../../../context/AuthContext';
import { confirmar } from '../../../../utils/dialogos';
import styles from './SuscripcionCalendario.module.css';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
}

/** URL pública del feed. La API vive en el mismo dominio que la web. */
export function urlFeed(token: string, origen = window.location.origin): string {
  return `${origen}/api/agenda/ics/${token}.ics`;
}

/**
 * Suscribirse a «Mi agenda» desde Google Calendar u Outlook con una URL
 * privada, sin conectar cuentas. Aquí se crea, se copia, se regenera (si se
 * filtró) o se desactiva esa URL.
 */
export default function SuscripcionCalendario({ abierto, onCerrar }: Props) {
  const { sessionToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState(false);

  const pedir = async (method: 'GET' | 'POST' | 'DELETE') => {
    setCargando(true);
    setError('');
    try {
      const r = await fetch('/api/me/agenda/ics', { method, headers: { 'x-session-token': sessionToken ?? '' } });
      const b = await r.json();
      if (!r.ok) throw new Error(b?.message ?? 'No se pudo completar');
      setToken(b.token ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (abierto) { setCopiado(false); void pedir('GET'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const url = token ? urlFeed(token) : '';

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* el campo queda seleccionable para copiarlo a mano */ }
  };

  const regenerar = async () => {
    const ok = await confirmar({
      titulo: '¿Regenerar el enlace?',
      texto: 'El enlace actual dejará de funcionar. Tendrás que volver a suscribirte en Google u Outlook con el nuevo.',
      confirmar: 'Regenerar',
      peligro: true,
    });
    if (ok) void pedir('POST');
  };

  const desactivar = async () => {
    const ok = await confirmar({
      titulo: '¿Desactivar el enlace?',
      texto: 'Tu calendario en Google u Outlook dejará de actualizarse. Puedes crear uno nuevo cuando quieras.',
      confirmar: 'Desactivar',
      peligro: true,
    });
    if (ok) void pedir('DELETE');
  };

  const webcal = url.replace(/^https?:/, 'webcal:');

  return (
    <Modal isOpen={abierto} onClose={onCerrar} title="Ver mi agenda en Google u Outlook" wide>
      <div className={styles.cuerpo}>
        <p className={styles.intro}>
          Suscríbete a tu agenda desde tu calendario con un enlace privado, sin conectar tu cuenta. Incluye las
          sesiones y los bloques de entrevistas que tienes visibles aquí, del mes pasado a seis meses adelante.
        </p>

        {error && <p className={styles.error}>{error}</p>}

        {!token ? (
          <button type="button" className={styles.primario} onClick={() => void pedir('POST')} disabled={cargando}>
            <Icon name="link" size="sm" /> {cargando ? 'Creando…' : 'Crear mi enlace'}
          </button>
        ) : (
          <>
            <div className={styles.campo}>
              <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Enlace de tu calendario" />
              <button type="button" className={styles.secundario} onClick={() => void copiar()}>
                <Icon name={copiado ? 'check' : 'content_copy'} size="sm" /> {copiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            <div className={styles.destinos}>
              <a
                className={styles.primario}
                href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="event" size="sm" /> Agregar a Google Calendar
              </a>
              <a
                className={styles.primario}
                href={`https://outlook.office.com/calendar/0/addfromweb?url=${encodeURIComponent(url)}&name=${encodeURIComponent('Mi agenda')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="event" size="sm" /> Agregar a Outlook
              </a>
            </div>

            <details className={styles.pasos}>
              <summary>¿No funcionó el botón? Agrégalo a mano</summary>
              <ul>
                <li><strong>Google Calendar:</strong> en «Otros calendarios», el «+» → «Desde URL» → pega el enlace.</li>
                <li><strong>Outlook:</strong> «Agregar calendario» → «Suscribirse desde la web» → pega el enlace.</li>
                <li><strong>Apple Calendar:</strong> Archivo → «Nueva suscripción a calendario» → pega el enlace.</li>
              </ul>
            </details>

            <ul className={styles.avisos}>
              <li>
                <Icon name="schedule" size="sm" />
                Google actualiza las suscripciones cada 8 a 24 horas y Outlook cada pocas horas; no se puede
                forzar. Para lo del momento, usa esta página.
              </li>
              <li>
                <Icon name="lock" size="sm" />
                Quien tenga el enlace ve tu agenda: no lo compartas. No incluye nombres de alumnos, solo la hora y
                la competencia de cada entrevista.
              </li>
            </ul>

            <div className={styles.gestion}>
              <button type="button" className={styles.enlace} onClick={() => void regenerar()} disabled={cargando}>
                Regenerar enlace
              </button>
              <button type="button" className={styles.enlacePeligro} onClick={() => void desactivar()} disabled={cargando}>
                Desactivar
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
