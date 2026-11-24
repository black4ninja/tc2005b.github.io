import { useEffect, useState } from 'react';
import Modal from '../../atoms/Modal/Modal';
import Icon from '../../atoms/Icon/Icon';
import { useAuth } from '../../../../context/AuthContext';
import { confirmar } from '../../../../utils/dialogos';
import type { GrupoAgenda } from '../../../../utils/miAgenda';
import styles from './SuscripcionCalendario.module.css';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  grupos: GrupoAgenda[];
}

/**
 * URL pública del feed: el global o, con `grupoId`, el de un grupo. La API vive
 * en el mismo dominio que la web.
 */
export function urlFeed(token: string, grupoId?: string, origen = window.location.origin): string {
  return grupoId
    ? `${origen}/api/agenda/ics/${token}/${grupoId}.ics`
    : `${origen}/api/agenda/ics/${token}.ics`;
}

function enGoogle(url: string): string {
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(url.replace(/^https?:/, 'webcal:'))}`;
}

function enOutlook(url: string, nombre: string): string {
  return `https://outlook.office.com/calendar/0/addfromweb?url=${encodeURIComponent(url)}&name=${encodeURIComponent(nombre)}`;
}

/** Una fila por grupo: su enlace propio, para tenerlo como calendario aparte. */
function FilaGrupo({ grupo, token, copiado, onCopiar }: {
  grupo: GrupoAgenda; token: string; copiado: boolean; onCopiar: (url: string, clave: string) => void;
}) {
  const url = urlFeed(token, grupo.id);
  return (
    <li className={styles.filaGrupo}>
      <span className={styles.nombreGrupo} title={grupo.name}>{grupo.name}</span>
      <span className={styles.accionesGrupo}>
        <button type="button" className={styles.mini} onClick={() => onCopiar(url, grupo.id)} aria-label={`Copiar el enlace de ${grupo.name}`}>
          <Icon name={copiado ? 'check' : 'content_copy'} size="sm" /> {copiado ? 'Copiado' : 'Copiar'}
        </button>
        <a className={styles.mini} href={enGoogle(url)} target="_blank" rel="noopener noreferrer" aria-label={`Agregar ${grupo.name} a Google Calendar`}>
          Google
        </a>
        <a className={styles.mini} href={enOutlook(url, grupo.name)} target="_blank" rel="noopener noreferrer" aria-label={`Agregar ${grupo.name} a Outlook`}>
          Outlook
        </a>
      </span>
    </li>
  );
}

/**
 * Suscribirse a «Mi agenda» desde Google Calendar u Outlook con una URL
 * privada, sin conectar cuentas. Aquí se crea, se copia, se regenera (si se
 * filtró) o se desactiva esa URL.
 */
export default function SuscripcionCalendario({ abierto, onCerrar, grupos }: Props) {
  const { sessionToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  // Qué enlace se acaba de copiar: 'global' o el id del grupo.
  const [copiado, setCopiado] = useState<string | null>(null);

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
    if (abierto) { setCopiado(null); void pedir('GET'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const url = token ? urlFeed(token) : '';

  const copiar = async (texto: string, clave: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(clave);
      setTimeout(() => setCopiado((c) => (c === clave ? null : c)), 2000);
    } catch { /* el campo queda seleccionable para copiarlo a mano */ }
  };

  // Solo los grupos con algo que mostrar; primero los suyos. Al admin le
  // llegan todos los activos: los ajenos van plegados.
  const conAlgo = grupos.filter((g) => g.tieneSesiones !== false || g.tieneEntrevistas !== false);
  const propios = conAlgo.filter((g) => g.esMio);
  const ajenos = conAlgo.filter((g) => !g.esMio);

  const regenerar = async () => {
    const ok = await confirmar({
      titulo: '¿Regenerar el enlace?',
      texto: 'El enlace actual y los de cada grupo dejarán de funcionar. Tendrás que volver a suscribirte en Google u Outlook con los nuevos.',
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


  return (
    <Modal isOpen={abierto} onClose={onCerrar} title="Ver mi agenda en Google u Outlook" wide>
      <div className={styles.cuerpo}>
        <p className={styles.intro}>
          Suscríbete a tu agenda desde tu calendario con un enlace privado, sin conectar tu cuenta. El enlace
          general incluye las sesiones y los bloques de entrevistas que tienes visibles aquí, del mes pasado a seis
          meses adelante.
        </p>

        {error && <p className={styles.error}>{error}</p>}

        {!token ? (
          <>
            <p className={styles.intro}>
              Al crearlo tendrás <strong>un enlace general</strong> y <strong>uno por cada grupo</strong>, para tener
              cada grupo como calendario aparte.
            </p>
            <button type="button" className={styles.primario} onClick={() => void pedir('POST')} disabled={cargando}>
              <Icon name="link" size="sm" /> {cargando ? 'Creando…' : 'Crear mis enlaces'}
            </button>
          </>
        ) : (
          <>
            <div className={styles.campo}>
              <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Enlace de tu calendario" />
              <button type="button" className={styles.secundario} onClick={() => void copiar(url, 'global')}>
                <Icon name={copiado === 'global' ? 'check' : 'content_copy'} size="sm" /> {copiado === 'global' ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            <div className={styles.destinos}>
              <a
                className={styles.primario}
                href={enGoogle(url)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="event" size="sm" /> Agregar a Google Calendar
              </a>
              <a
                className={styles.primario}
                href={enOutlook(url, 'Mi agenda')}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="event" size="sm" /> Agregar a Outlook
              </a>
            </div>

            {conAlgo.length > 0 && (
              <section className={styles.porGrupo}>
                <h3>O un calendario por grupo</h3>
                <p>
                  Cada grupo como calendario aparte, para encenderlo, apagarlo o darle color por separado en Google u
                  Outlook. Incluye sus sesiones y sus entrevistas.
                </p>
                <ul>
                  {propios.map((g) => (
                    <FilaGrupo key={g.id} grupo={g} token={token} copiado={copiado === g.id} onCopiar={(u, k) => void copiar(u, k)} />
                  ))}
                </ul>
                {ajenos.length > 0 && (
                  <details className={styles.pasos}>
                    <summary>Otros grupos activos ({ajenos.length})</summary>
                    <ul>
                      {ajenos.map((g) => (
                        <FilaGrupo key={g.id} grupo={g} token={token} copiado={copiado === g.id} onCopiar={(u, k) => void copiar(u, k)} />
                      ))}
                    </ul>
                  </details>
                )}
              </section>
            )}

            <details className={styles.pasos}>
              <summary>¿No funcionó el botón? Agrégalo a mano</summary>
              <ul>
                <li><strong>Google Calendar:</strong> en «Otros calendarios», el «+» → «Desde URL» → pega el enlace (el general o el de un grupo).</li>
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
