import { useEffect, useMemo, useState } from 'react';
import Modal from '../../atoms/Modal/Modal';
import Icon from '../../atoms/Icon/Icon';
import { useAuth } from '../../../../context/AuthContext';
import { fechaLarga, fechaYHora, hora } from '../../../../utils/agenda';
import styles from './BitacoraDiaModal.module.css';

/** Un evento tal cual lo manda `GET …/dias/:diaId/bitacora`. */
interface EventoBitacora {
  tipo: 'reserva' | 'cancelacion' | 'movimiento';
  en: string;
  hueco: string;
  desde: string | null;
  citaId: string;
  alumno: { id: string; nombre: string; matricula: string } | null;
  competencia: string | null;
  por: { id: string; nombre: string; esElAlumno: boolean } | null;
}

const TIPO: Record<EventoBitacora['tipo'], { texto: string; icono: string; clase: string }> = {
  reserva: { texto: 'Reservó', icono: 'event_available', clase: styles.tipoReserva },
  cancelacion: { texto: 'Canceló', icono: 'event_busy', clase: styles.tipoCancelacion },
  movimiento: { texto: 'Movida', icono: 'swap_vert', clase: styles.tipoMovimiento },
};

/** Minúsculas y sin acentos: «nunez» encuentra a «Núñez». */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Todo lo que se ve en la fila, en un solo texto para buscar. */
function textoDeEvento(e: EventoBitacora): string {
  return normalizar([
    fechaYHora(e.en),
    TIPO[e.tipo].texto,
    e.desde ? hora(e.desde) : '',
    hora(e.hueco),
    e.alumno?.nombre ?? '',
    e.alumno?.matricula ?? '',
    e.competencia ?? '',
    !e.por ? 'no registrado' : e.por.esElAlumno ? 'el alumno' : e.por.nombre,
  ].join(' '));
}

/** «SICT0203. Desarrollo de escenarios» → «SICT0203»: la tabla no da para más. */
function codigo(competencia: string | null): string {
  if (!competencia) return '—';
  return competencia.split(/[.:\s]/)[0] || competencia;
}

interface Props {
  grupoId: string;
  dia: { id: string; inicio: string };
  /** Abre ya filtrada a un hueco (ISO). `null` = todo el día. */
  hueco: string | null;
  onClose: () => void;
}

/**
 * Quién reservó, canceló o movió cada hueco del día, y cuándo. Desde el botón
 * del día se ve todo; desde una fila, solo lo que pasó en ese hueco —con un
 * enlace para ver el resto sin cerrar—.
 */
export default function BitacoraDiaModal({ grupoId, dia, hueco: huecoInicial, onClose }: Props) {
  const { sessionToken } = useAuth();
  const [eventos, setEventos] = useState<EventoBitacora[] | null>(null);
  const [error, setError] = useState('');
  const [hueco, setHueco] = useState<string | null>(huecoInicial);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/admin/grupos/${grupoId}/agenda-entrevistas/dias/${dia.id}/bitacora`, {
      headers: { 'x-session-token': sessionToken ?? '' },
    })
      .then(async (r) => {
        const json = await r.json().catch(() => null);
        if (cancelado) return;
        if (!r.ok) throw new Error(json?.message || 'No se pudo leer la bitácora');
        setEventos(json.eventos ?? []);
      })
      .catch((e: Error) => { if (!cancelado) setError(e.message); });
    return () => { cancelado = true; };
  }, [grupoId, dia.id, sessionToken]);

  // Un movimiento toca DOS huecos: sale en la bitácora de los dos.
  const delHueco = useMemo(
    () => (eventos ?? []).filter((e) => !hueco || e.hueco === hueco || e.desde === hueco),
    [eventos, hueco],
  );
  // Lo más reciente arriba: lo que se viene a buscar casi siempre es lo último
  // que pasó. Cada palabra de la búsqueda tiene que aparecer en la fila, en
  // cualquier columna: «fuentes cancel» deja solo las cancelaciones de Fuentes.
  const visibles = useMemo(() => {
    const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
    return delHueco
      .filter((e) => {
        if (palabras.length === 0) return true;
        const texto = textoDeEvento(e);
        return palabras.every((p) => texto.includes(p));
      })
      .reverse();
  }, [delHueco, busqueda]);
  const cuenta = (tipo: EventoBitacora['tipo']) => visibles.filter((e) => e.tipo === tipo).length;

  return (
    <Modal
      isOpen
      onClose={onClose}
      extraWide
      title={hueco ? `Bitácora del hueco de las ${hora(hueco)}` : `Bitácora — ${fechaLarga(dia.inicio)}`}
    >
      <div className={styles.caja}>
        <div className={styles.resumen}>
          {eventos && (
            <span>
              {busqueda.trim() && `${visibles.length} de ${delHueco.length} · `}
              {cuenta('reserva')} reserva{cuenta('reserva') === 1 ? '' : 's'}
              {' · '}{cuenta('cancelacion')} cancelaci{cuenta('cancelacion') === 1 ? 'ón' : 'ones'}
              {' · '}{cuenta('movimiento')} cambio{cuenta('movimiento') === 1 ? '' : 's'} de hora
            </span>
          )}
          <span className={styles.herramientas}>
            <span className={styles.buscador}>
              <Icon name="search" size="sm" />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Filtrar por alumno, matrícula, hora…"
                aria-label="Filtrar la bitácora"
                autoFocus
              />
            </span>
            {hueco && (
              <button type="button" className={styles.verTodo} onClick={() => setHueco(null)}>
                <Icon name="list" size="sm" /> Ver todo el día
              </button>
            )}
          </span>
        </div>

        {error ? (
          <p className={styles.error}>{error}</p>
        ) : eventos === null ? (
          <p className={styles.vacio}>Cargando…</p>
        ) : visibles.length === 0 ? (
          <p className={styles.vacio}>
            {busqueda.trim()
              ? `Nada coincide con «${busqueda.trim()}».`
              : hueco ? 'Nadie ha reservado nunca este hueco.' : 'Todavía nadie ha reservado en este día.'}
          </p>
        ) : (
          <div className={styles.tablaCaja}>
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>Cuándo</th>
                  <th>Qué pasó</th>
                  <th>Hueco</th>
                  <th>Alumno</th>
                  <th>Competencia</th>
                  <th>Lo hizo</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((e, i) => {
                  const t = TIPO[e.tipo];
                  return (
                    <tr key={`${e.citaId}-${e.tipo}-${i}`}>
                      <td className={styles.cuando}>{fechaYHora(e.en)}</td>
                      <td>
                        <span className={`${styles.tipo} ${t.clase}`}>
                          <Icon name={t.icono} size="sm" /> {t.texto}
                        </span>
                      </td>
                      <td className={styles.hueco}>
                        {e.desde ? `${hora(e.desde)} → ${hora(e.hueco)}` : hora(e.hueco)}
                      </td>
                      <td>
                        <span className={styles.alumno}>{e.alumno?.nombre ?? '—'}</span>
                        {e.alumno?.matricula && <span className={styles.matricula}>{e.alumno.matricula}</span>}
                      </td>
                      <td title={e.competencia ?? undefined}>{codigo(e.competencia)}</td>
                      <td>
                        {!e.por ? (
                          <span className={styles.sinDato} title="Antes de la bitácora no se guardaba quién cancelaba">
                            no registrado
                          </span>
                        ) : e.por.esElAlumno ? (
                          'El alumno'
                        ) : (
                          <span className={styles.otro}>{e.por.nombre || 'Profesor'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className={styles.nota}>
          Las horas son de Querétaro. Quién cancela o mueve una cita se guarda desde el 15 de octubre de 2026;
          en las anteriores sale «no registrado».
        </p>
      </div>
    </Modal>
  );
}
