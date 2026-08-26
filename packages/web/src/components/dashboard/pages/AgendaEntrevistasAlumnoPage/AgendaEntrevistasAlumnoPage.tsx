import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import Icon from '../../atoms/Icon/Icon';
import DashButton from '../../atoms/DashButton/DashButton';
import Modal from '../../atoms/Modal/Modal';
import { estadoHueco, fechaLarga, fechaYHora, hora, rangoHoras } from '../../../../utils/agenda';
import type { AgendaAlumno, DiaAlumno, HuecoAlumno } from '../../../../types/agenda';
import styles from './AgendaEntrevistasAlumnoPage.module.css';

const API_BASE = '/api';

function mensajeDeError(e: unknown, porDefecto: string): string {
  return e instanceof Error && e.message ? e.message : porDefecto;
}

/**
 * Donde el alumno elige su hora de entrevista.
 *
 * Es lo ÚNICO del módulo "Preguntas" que el alumno ve: ni el banco, ni qué
 * pregunta le tocará, ni la de nadie más. De aquí sale el orden en que el
 * profesor proyecta el día de las entrevistas.
 *
 * Sustituye a una hoja de cálculo compartida en la que las reglas eran un texto
 * en la cabecera y el cumplimiento, voluntario. Aquí las aplica el servidor; la
 * pantalla se limita a explicarlas ANTES de que alguien pulse, que es lo que
 * evita el rechazo con el clic ya dado. Por eso los huecos que aún no cumplen la
 * antelación salen apagados y con su motivo, en vez de desaparecer.
 *
 * Los huecos de otros salen como «ocupado» y sin nombre: para elegir basta con
 * saber si está libre.
 */
export default function AgendaEntrevistasAlumnoPage() {
  const { grupoId } = useParams();
  const { sessionToken } = useAuth();

  const [agenda, setAgenda] = useState<AgendaAlumno | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [guardando, setGuardando] = useState(false);
  /** Hueco elegido, a la espera de que diga qué competencia viene a evaluar. */
  const [eligiendo, setEligiendo] = useState<{ dia: DiaAlumno; hueco: HuecoAlumno } | null>(null);

  const headers = useMemo<Record<string, string>>(() => ({
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  }), [sessionToken]);

  const cargar = useCallback(async () => {
    if (!grupoId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/alumno/grupos/${grupoId}/agenda-entrevistas`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) throw new Error('No se pudo cargar la agenda');
      setAgenda(await res.json() as AgendaAlumno);
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No se pudo cargar la agenda'));
    } finally {
      setLoading(false);
    }
  }, [grupoId, sessionToken]);

  useEffect(() => { cargar(); }, [cargar]);

  async function reservar(competenciaId: string) {
    if (!eligiendo || !grupoId) return;
    setError('');
    setGuardando(true);
    try {
      const res = await fetch(`${API_BASE}/alumno/grupos/${grupoId}/agenda-entrevistas/citas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          diaId: eligiendo.dia.id, inicio: eligiendo.hueco.inicio, competenciaId,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || 'No se pudo agendar');
      }
      setEligiendo(null);
      setAviso(`Listo: ${fechaYHora(eligiendo.hueco.inicio)}.`);
      // Se recarga entera y no se pinta por adelantado: un hueco lo puede tomar
      // otro entre que se ve y se pulsa, y lo que manda es lo que quedó.
      await cargar();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No se pudo agendar'));
    } finally {
      setGuardando(false);
    }
  }

  async function cancelar(citaId: string) {
    if (!grupoId) return;
    setError('');
    setGuardando(true);
    try {
      const res = await fetch(
        `${API_BASE}/alumno/grupos/${grupoId}/agenda-entrevistas/citas/${citaId}`,
        { method: 'DELETE', headers },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || 'No se pudo cancelar');
      }
      await cargar();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No se pudo cancelar'));
    } finally {
      setGuardando(false);
    }
  }

  if (loading) return <div className={styles.page}><p>Cargando…</p></div>;

  if (!agenda || agenda.dias.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.titulo}>Agendar entrevistas</h1>
        <div className={styles.apagado}>
          <Icon name="event_busy" size="lg" />
          <p>Todavía no hay días abiertos para entrevistas.</p>
          <p className={styles.hint}>Tu profesor los publicará aquí; vuelve a mirar más adelante.</p>
        </div>
      </div>
    );
  }

  const { reglas } = agenda;
  const sinOportunidades = agenda.competencias.every((c) => c.usados >= reglas.maxIntentos);

  return (
    <div className={styles.page}>
      <h1 className={styles.titulo}>Agendar entrevistas</h1>

      {/* Las reglas ARRIBA y siempre, como en la cabecera de la hoja: son la
          parte que se reclama después si no se leyó antes. */}
      <ul className={styles.reglas}>
        <li>
          Cada hueco es <strong>una competencia</strong>. Si quieres evaluar dos, aparta dos huecos.
        </li>
        <li>
          Tienes <strong>{reglas.maxIntentos} oportunidades por competencia</strong>.
        </li>
        <li>
          Hay que agendar con al menos <strong>{reglas.horasHabilesAntelacion} horas hábiles</strong>{' '}
          de anticipación: el fin de semana no cuenta.
        </li>
        <li>
          Puedes cancelar hasta <strong>{reglas.margenCancelacionMinutos} minutos antes</strong> de tu
          hora. Después cuenta como celebrada, aunque no te presentes.
        </li>
      </ul>

      {error && <div className={styles.error} onClick={() => setError('')}>{error}</div>}
      {aviso && <div className={styles.aviso} onClick={() => setAviso('')}>{aviso}</div>}

      <section className={styles.bloque}>
        <h2 className={styles.subtitulo}>Tus citas</h2>
        {agenda.misCitas.length === 0 ? (
          <p className={styles.hint}>Todavía no tienes ninguna. Elige un hueco libre abajo.</p>
        ) : (
          <ul className={styles.misCitas}>
            {agenda.misCitas.map((cita) => (
              <li key={cita.id} className={styles.miCita}>
                <div>
                  <span className={styles.citaHora}>{fechaYHora(cita.inicio)}</span>
                  <span className={styles.citaCompetencia}>
                    {cita.competencia?.nombre ?? 'Sin competencia'} · {cita.intento}.º intento
                  </span>
                  {cita.diaNota && <span className={styles.citaNota}>{cita.diaNota}</span>}
                </div>
                <DashButton
                  variant="outline"
                  disabled={!cita.cancelable || guardando}
                  onClick={() => cancelar(cita.id)}
                  title={cita.cancelable
                    ? 'Cancelar esta cita'
                    : `Ya pasó el margen de ${reglas.margenCancelacionMinutos} minutos`}
                >
                  Cancelar
                </DashButton>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.bloque}>
        <h2 className={styles.subtitulo}>Oportunidades que te quedan</h2>
        <ul className={styles.competencias}>
          {agenda.competencias.map((c) => (
            <li key={c.id} className={c.usados >= reglas.maxIntentos ? styles.compAgotada : ''}>
              <span>{c.nombre}</span>
              <span className={styles.compCuenta}>{c.usados}/{reglas.maxIntentos}</span>
            </li>
          ))}
        </ul>
      </section>

      {agenda.dias.map((dia) => (
        <section key={dia.id} className={styles.bloque}>
          <h2 className={styles.subtitulo}>
            {fechaLarga(dia.inicio)}
            <span className={styles.diaRango}>{rangoHoras(dia.inicio, dia.fin)}</span>
            {dia.cerrado && <span className={styles.cerrado}>cerrado</span>}
          </h2>
          {dia.nota && <p className={styles.diaNota}>{dia.nota}</p>}
          <div className={styles.huecos}>
            {dia.huecos.map((hueco) => {
              const estado = estadoHueco(hueco, agenda.agendableDesde, agenda.serverNow);
              const puedo = estado === 'libre' && !dia.cerrado && !sinOportunidades;
              return (
                <button
                  key={hueco.inicio}
                  className={`${styles.hueco} ${styles[`hueco_${estado}`]}`}
                  disabled={!puedo || guardando}
                  onClick={() => setEligiendo({ dia, hueco })}
                  title={{
                    libre: 'Libre: pulsa para apartarlo',
                    mio: `Tuyo: ${hueco.mia?.competencia ?? ''}`,
                    ocupado: 'Ya lo tomó alguien',
                    pronto: `Demasiado justo: hay que agendar con ${reglas.horasHabilesAntelacion} horas hábiles`,
                    pasado: 'Ya pasó',
                  }[estado]}
                >
                  {hora(hueco.inicio)}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {eligiendo && (
        <Modal isOpen onClose={() => setEligiendo(null)} title={`Entrevista de ${fechaYHora(eligiendo.hueco.inicio)}`}>
          <p className={styles.hint}>¿Qué competencia vienes a evaluar?</p>
          <div className={styles.elegirComp}>
            {agenda.competencias.map((c) => {
              const agotada = c.usados >= reglas.maxIntentos;
              return (
                <button
                  key={c.id}
                  className={styles.opcionComp}
                  disabled={agotada || guardando}
                  onClick={() => reservar(c.id)}
                  title={agotada ? 'Ya usaste tus dos oportunidades en esta competencia' : undefined}
                >
                  <span>{c.nombre}</span>
                  <span className={styles.compCuenta}>
                    {agotada ? 'sin oportunidades' : `${c.usados + 1}.º intento`}
                  </span>
                </button>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}
