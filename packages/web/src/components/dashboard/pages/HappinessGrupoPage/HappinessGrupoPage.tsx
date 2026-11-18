import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import Icon from '../../atoms/Icon/Icon';
import DashButton from '../../atoms/DashButton/DashButton';
import Modal from '../../atoms/Modal/Modal';
import HappinessMisEntradas from '../../organisms/HappinessMisEntradas/HappinessMisEntradas';
import { ESTADOS_HAPPINESS, fechaLargaDia, horaCurso, nombreRol } from '../../../../utils/happiness';
import { exportarHappinessGrupo } from '../../../../utils/happinessExport';
import type { EntradaHappiness, TableroHappiness } from '../../../../types/happiness';
import styles from './HappinessGrupoPage.module.css';

type Pestana = 'tablero' | 'mias';

/**
 * Happiness Door del grupo, para el profesor y el admin.
 *
 * Dos pestañas: el TABLERO —las entradas de todo el grupo de un día, como
 * post-its en tres columnas, con su autor— y MIS ENTRADAS, porque el staff
 * también escribe las suyas. El tablero va primero: es a lo que se viene.
 */
export default function HappinessGrupoPage() {
  const { id: grupoId } = useParams<{ id: string }>();
  const { sessionToken } = useAuth();
  const [pestana, setPestana] = useState<Pestana>('tablero');
  const [exportando, setExportando] = useState(false);
  const [errorExport, setErrorExport] = useState<string | null>(null);
  const base = `/api/admin/grupos/${grupoId}/happiness`;

  async function exportar() {
    if (!grupoId) return;
    setExportando(true);
    setErrorExport(null);
    try {
      await exportarHappinessGrupo(grupoId, sessionToken ?? '');
    } catch (e) {
      setErrorExport(e instanceof Error ? e.message : 'No se pudo exportar');
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Happiness Door</h1>
          <p className={styles.subtitulo}>
            Cómo le fue a cada miembro del grupo, día por día. Abre un post-it para leer la entrada completa.
          </p>
        </div>
        <DashButton
          variant="outline"
          onClick={() => void exportar()}
          disabled={exportando}
          title="Descarga todo el histórico del grupo, segmentado por día"
        >
          <Icon name="download" size="sm" /> {exportando ? 'Exportando…' : 'Exportar a Excel'}
        </DashButton>
      </header>
      {errorExport && (
        <div className={styles.error} role="alert">{errorExport}</div>
      )}

      <div className={styles.pestanas} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={pestana === 'tablero'}
          className={`${styles.pestana} ${pestana === 'tablero' ? styles.pestanaActiva : ''}`}
          onClick={() => setPestana('tablero')}
        >
          <Icon name="view_kanban" size="sm" /> Tablero
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pestana === 'mias'}
          className={`${styles.pestana} ${pestana === 'mias' ? styles.pestanaActiva : ''}`}
          onClick={() => setPestana('mias')}
        >
          <Icon name="edit_note" size="sm" /> Mis entradas
        </button>
      </div>

      {pestana === 'tablero' ? <Tablero base={base} /> : <HappinessMisEntradas apiBase={base} />}
    </div>
  );
}

function Tablero({ base }: { base: string }) {
  const { sessionToken } = useAuth();
  const [dia, setDia] = useState<string | null>(null);
  const [tablero, setTablero] = useState<TableroHappiness | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<EntradaHappiness | null>(null);

  const cargar = useCallback(async (d: string | null) => {
    setCargando(true);
    try {
      const url = d ? `${base}/tablero?dia=${d}` : `${base}/tablero`;
      const res = await fetch(url, { headers: { 'x-session-token': sessionToken ?? '' } });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || 'No se pudo cargar el tablero');
      setTablero(body as TableroHappiness);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el tablero');
    } finally {
      setCargando(false);
    }
  }, [base, sessionToken]);

  useEffect(() => { void cargar(dia); }, [cargar, dia]);

  const actual = tablero?.dia ?? dia;
  // Las flechas saltan entre días CON entradas: recorrer días vacíos uno a uno
  // no le dice nada a nadie.
  const anterior = tablero && actual ? [...tablero.dias].reverse().find((x) => x < actual) : undefined;
  const siguiente = tablero && actual ? tablero.dias.find((x) => x > actual) : undefined;
  const cuenta = (estado: string) => tablero?.entradas.filter((e) => e.estado === estado).length ?? 0;

  return (
    <section className={styles.tablero} aria-label="Tablero del día">
      <div className={styles.navDia}>
        <button
          type="button"
          className={styles.flecha}
          aria-label="Día anterior con entradas"
          title="Día anterior con entradas"
          disabled={!anterior}
          onClick={() => anterior && setDia(anterior)}
        >
          <Icon name="chevron_left" />
        </button>
        <div className={styles.diaActual}>
          <span className={styles.diaNombre}>{actual ? fechaLargaDia(actual) : '…'}</span>
          <input
            type="date"
            className={styles.diaInput}
            aria-label="Elegir día"
            value={actual ?? ''}
            onChange={(e) => e.target.value && setDia(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={styles.flecha}
          aria-label="Día siguiente con entradas"
          title="Día siguiente con entradas"
          disabled={!siguiente}
          onClick={() => siguiente && setDia(siguiente)}
        >
          <Icon name="chevron_right" />
        </button>
        {tablero && actual !== tablero.hoy && (
          <DashButton variant="outline" onClick={() => setDia(tablero.hoy)}>Hoy</DashButton>
        )}
      </div>

      {error && <div className={styles.error} role="alert">{error}</div>}

      <div className={`${styles.columnas} ${cargando ? styles.cargando : ''}`}>
        {ESTADOS_HAPPINESS.map((s) => {
          const lista = tablero?.entradas.filter((e) => e.estado === s.key) ?? [];
          return (
            <div key={s.key} className={`${styles.columna} ${styles[s.key]}`}>
              <h2 className={styles.columnaTitulo}>
                <Icon name={s.icono} />
                {s.label}
                <span className={styles.columnaCuenta}>{cuenta(s.key)}</span>
              </h2>
              {lista.length === 0 ? (
                <p className={styles.columnaVacia}>Nadie todavía.</p>
              ) : (
                <ul className={styles.postits}>
                  {lista.map((e) => (
                    <li key={e.id}>
                      <button type="button" className={`${styles.postit} ${styles[e.estado]}`} onClick={() => setAbierta(e)}>
                        <span className={styles.postitTexto}>{e.texto}</span>
                        <span className={styles.postitAutor}>
                          {e.autor?.name ?? 'Usuario eliminado'}
                          {e.autor && e.autor.rol !== 'alumno' && (
                            <span className={styles.rol}>{nombreRol(e.autor.rol)}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {abierta && (
        <Modal isOpen onClose={() => setAbierta(null)} title={abierta.autor?.name ?? 'Usuario eliminado'} wide>
          <div className={styles.detalle}>
            <div className={styles.detalleMeta}>
              {(() => {
                const def = ESTADOS_HAPPINESS.find((s) => s.key === abierta.estado);
                return (
                  <span className={`${styles.detalleEstado} ${styles[abierta.estado]}`}>
                    <Icon name={def?.icono ?? 'sentiment_neutral'} size="sm" />
                    {def?.label ?? abierta.estado}
                  </span>
                );
              })()}
              {abierta.autor && <span className={styles.rol}>{nombreRol(abierta.autor.rol)}</span>}
              <span className={styles.detalleFecha}>
                {fechaLargaDia(abierta.dia)} · {horaCurso(abierta.createdAt)}
                {abierta.updatedAt !== abierta.createdAt && ' · editada'}
              </span>
            </div>
            <p className={styles.detalleTexto}>{abierta.texto}</p>
          </div>
        </Modal>
      )}
    </section>
  );
}
