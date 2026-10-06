import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Icon from '../../atoms/Icon/Icon';
import type { Pregunta } from '../../../../types/preguntas';
import styles from './PanelAsesorias.module.css';

const API_BASE = '/api';

interface Props {
  grupoId: string;
  /** Las marcadas para asesoría, ya filtradas por la competencia y la búsqueda. */
  preguntas: Pregunta[];
  headers: Record<string, string>;
  onError: (mensaje: string) => void;
}

/** El enlace que abre el alumno. Absoluto: va dentro del QR. */
function enlaceDe(token: string): string {
  return `${window.location.origin}/asesoria/${token}`;
}

/**
 * La pestaña de ASESORÍAS: el pool de preguntas apartadas para practicar.
 *
 * Cada pregunta enciende su propio visor —una pantalla sin reloj que se abre
 * sin sesión— y lo comparte por enlace o por QR. Así, con varios alumnos en
 * asesoría, cada uno practica con la suya en su teléfono al mismo tiempo.
 * Apagarlo cierra el enlace al momento.
 */
export default function PanelAsesorias({ grupoId, preguntas, headers, onError }: Props) {
  /** preguntaId → token del visor encendido. */
  const [visores, setVisores] = useState<Map<string, string>>(new Map());
  const [enVuelo, setEnVuelo] = useState<Set<string>>(new Set());
  const [copiado, setCopiado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/asesorias/visores`, { headers });
      if (!res.ok) return;
      const data = await res.json() as { visores?: { preguntaId: string | null; token: string }[] };
      setVisores(new Map((data.visores ?? [])
        .filter((v) => v.preguntaId)
        .map((v) => [v.preguntaId!, v.token])));
    } catch {
      // Sin la lista, las tarjetas salen apagadas; encender devuelve el mismo enlace.
    }
  }, [grupoId, headers]);

  useEffect(() => { void cargar(); }, [cargar]);

  async function conmutar(p: Pregunta) {
    const encendido = visores.has(p.id);
    setEnVuelo((s) => new Set(s).add(p.id));
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/asesorias/${p.id}/visor`, {
        method: encendido ? 'DELETE' : 'POST', headers,
      });
      const data = await res.json().catch(() => ({})) as {
        message?: string; visor?: { token: string };
      };
      if (!res.ok) throw new Error(data.message || 'No se pudo cambiar el visor');
      setVisores((prev) => {
        const sig = new Map(prev);
        if (encendido) sig.delete(p.id);
        else if (data.visor) sig.set(p.id, data.visor.token);
        return sig;
      });
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo cambiar el visor');
    } finally {
      setEnVuelo((s) => { const sig = new Set(s); sig.delete(p.id); return sig; });
    }
  }

  /**
   * Apaga TODOS los visores del grupo de un clic, también los de competencias
   * que el filtro esconde: es el «se acabó la asesoría». Sin confirmación a
   * propósito —tiene que ser rápido—; volver a encender es un clic por pregunta.
   */
  const [apagandoTodos, setApagandoTodos] = useState(false);
  async function apagarTodos() {
    setApagandoTodos(true);
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/asesorias/visores`, {
        method: 'DELETE', headers,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message || 'No se pudieron apagar los visores');
      }
      setVisores(new Map());
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudieron apagar los visores');
      await cargar();
    } finally {
      setApagandoTodos(false);
    }
  }

  async function copiar(p: Pregunta) {
    const token = visores.get(p.id);
    if (!token) return;
    try {
      await navigator.clipboard.writeText(enlaceDe(token));
      setCopiado(p.id);
      window.setTimeout(() => setCopiado((c) => (c === p.id ? null : c)), 2000);
    } catch {
      onError('No se pudo copiar el enlace');
    }
  }

  const activos = preguntas.filter((p) => visores.has(p.id)).length;

  return (
    <>
      <div className={styles.barra}>
        <p className={styles.explica}>
          Preguntas para practicar en asesoría. Cada una abre su propio visor, sin reloj: compártelo
          con el enlace o el QR y varios alumnos pueden practicar a la vez, cada uno con la suya.
        </p>
        <span className={styles.barraLado}>
          <span className={styles.contador}>
            {activos > 0 && <><strong>{activos}</strong> en pantalla · </>}
            {preguntas.length} pregunta{preguntas.length === 1 ? '' : 's'}
          </span>
          {/* Solo cuando hay algo que apagar: si no, sería un botón muerto. Cuenta
              TODOS los del grupo, también los que el filtro esconde. */}
          {visores.size > 0 && (
            <button
              className={`${styles.accion} ${styles.apagarTodos}`}
              onClick={() => void apagarTodos()}
              disabled={apagandoTodos}
              title="Cerrar todos los visores: sus enlaces dejan de funcionar"
            >
              <Icon name="stop_circle" size="sm" />
              {apagandoTodos ? 'Apagando…' : `Apagar todos (${visores.size})`}
            </button>
          )}
        </span>
      </div>

      {preguntas.length === 0 ? (
        <p className={styles.vacio}>
          No hay preguntas para asesoría. Márcalas con <strong>Asesoría</strong> en «Por pregunta»
          o desde el banco.
        </p>
      ) : (
        <div className={styles.lista}>
          {preguntas.map((p) => {
            const token = visores.get(p.id);
            const ocupado = enVuelo.has(p.id);
            return (
              <article key={p.id} className={`${styles.tarjeta} ${token ? styles.tarjetaActiva : ''}`}>
                <div className={styles.meta}>
                  {p.competencia && <span className={styles.competencia}>{p.competencia.competencia}</span>}
                  {token && (
                    <span className={styles.enVivo}>
                      <span className={styles.punto} aria-hidden="true" /> Visor activo
                    </span>
                  )}
                </div>
                {/* Encendido, el QR y el enlace van en la MISMA tarjeta, al lado
                    del enunciado: se enseña la lista y cada alumno escanea el de
                    su pregunta, sin abrir nada encima. */}
                <div className={`${styles.cuerpo} ${token ? styles.cuerpoConQr : ''}`}>
                  <p className={styles.texto}>{p.texto}</p>
                  {token && (
                    <div className={styles.compartir}>
                      <Qr enlace={enlaceDe(token)} />
                      <a
                        className={styles.enlace}
                        href={enlaceDe(token)}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir el visor en otra pestaña"
                      >
                        {enlaceDe(token).replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>
                <div className={styles.acciones}>
                  {token ? (
                    <>
                      <button className={styles.accion} onClick={() => void copiar(p)} title={enlaceDe(token)}>
                        <Icon name={copiado === p.id ? 'check' : 'link'} size="sm" />
                        {copiado === p.id ? 'Copiado' : 'Copiar enlace'}
                      </button>
                      <a className={styles.accion} href={enlaceDe(token)} target="_blank" rel="noreferrer" title="Abrir el visor en otra pestaña">
                        <Icon name="open_in_new" size="sm" /> Abrir
                      </a>
                      <button
                        className={`${styles.accion} ${styles.apagar}`}
                        onClick={() => void conmutar(p)}
                        disabled={ocupado}
                        title="Cerrar el visor: el enlace deja de funcionar"
                      >
                        <Icon name="stop_circle" size="sm" /> Apagar
                      </button>
                    </>
                  ) : (
                    <button
                      className={`${styles.accion} ${styles.encender}`}
                      onClick={() => void conmutar(p)}
                      disabled={ocupado}
                    >
                      <Icon name="cast" size="sm" /> {ocupado ? 'Encendiendo…' : 'Encender visor'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

    </>
  );
}

/**
 * El QR del enlace. Siempre negro sobre blanco, también en tema oscuro:
 * invertido, muchos lectores no lo reconocen.
 */
function Qr({ enlace }: { enlace: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let vivo = true;
    QRCode.toString(enlace, {
      type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' },
    }).then((s) => { if (vivo) setSvg(s); }).catch(() => setSvg(''));
    return () => { vivo = false; };
  }, [enlace]);
  return (
    <div
      className={styles.qr}
      role="img"
      aria-label="Código QR del visor: escanéalo para abrir la pregunta"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
