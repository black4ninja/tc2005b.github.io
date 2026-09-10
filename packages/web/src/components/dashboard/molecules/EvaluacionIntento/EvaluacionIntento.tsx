import { useEffect, useRef, useState } from 'react';
import Icon from '../../atoms/Icon/Icon';
import { esPenalizacion } from '@tc2005b/evaluacion';
import { etiquetaNivel, opcionesEvaluacion } from '../../../../utils/nivelesCompetencia';
import styles from './EvaluacionIntento.module.css';

/**
 * La fila de la malla que le toca a este alumno en esta competencia. Es un
 * recorte de lo que devuelve `GET .../alumnos/:id/competencias`: solo lo que
 * hace falta para evaluar un intento.
 */
export interface CompetenciaDeMalla {
  /** Id del registro `CompetenciaAlumno`, que es lo que se manda al PUT. */
  id: string;
  /** Id del catálogo, que es por donde empata con la competencia del banco. */
  competenciaId: string;
  competencia: string;
  valorPeriodo1: string | number;
  valorPeriodo2: string | number;
  retroPeriodo1: string;
  retroPeriodo2: string;
  esCalculada?: boolean;
  /** ¿Admite «Incipiente B −30 pts»? Decide si la opción se ofrece. */
  admitePenalizacion?: boolean;
}

export interface CambioEvaluacion {
  valor?: string;
  retro?: string;
}

interface Props {
  competencia: CompetenciaDeMalla;
  /** 1 o 2. El intento de la entrevista ES el periodo de la malla. */
  periodo: 1 | 2;
  /**
   * Guarda. Devuelve el mensaje de error del servidor, o `null` si fue bien.
   * Lo escribe el padre porque es quien tiene el grupo, el alumno y el token, y
   * quien tiene que refrescar la malla entera después: una competencia
   * calculada cambia de valor sin que nadie la toque.
   */
  onGuardar: (cambios: CambioEvaluacion) => Promise<string | null>;
}

/**
 * Evaluar la competencia desde la entrevista, sin salir de las notas.
 *
 * El primer intento de una competencia es su primer periodo y el segundo es el
 * segundo: son la misma cosa contada dos veces, así que el profesor puede poner
 * el nivel aquí, con lo que respondió el alumno delante, en vez de apuntarlo en
 * la nota y volver a copiarlo en la malla más tarde.
 *
 * La retro NO es la nota. La nota es privada y no afecta a nada; la retro la lee
 * el alumno en su panel y es lo que sostiene el nivel. Por eso van separadas y
 * por eso esto lo dice en voz alta: escribir una donde va la otra es el error
 * que se comete solo.
 */
export default function EvaluacionIntento({ competencia, periodo, onGuardar }: Props) {
  const valor = periodo === 1 ? competencia.valorPeriodo1 : competencia.valorPeriodo2;
  const retro = periodo === 1 ? competencia.retroPeriodo1 : competencia.retroPeriodo2;

  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [borrador, setBorrador] = useState(retro ?? '');
  const guardado = useRef(retro ?? '');

  // La malla se recarga entera después de cada guardado, así que el valor de
  // fuera manda: si no, la retro escrita en otra pestaña se quedaría pisada por
  // un borrador viejo.
  useEffect(() => {
    setBorrador(retro ?? '');
    guardado.current = retro ?? '';
  }, [retro]);

  async function guardar(cambios: CambioEvaluacion) {
    setGuardando(true);
    setError('');
    const fallo = await onGuardar(cambios);
    if (fallo) setError(fallo);
    setGuardando(false);
  }

  const sancionada = esPenalizacion(valor);
  const calculada = competencia.esCalculada === true;

  return (
    <div className={`${styles.caja} ${sancionada ? styles.cajaSancion : ''}`}>
      <div className={styles.fila}>
        <span className={styles.etiqueta}>
          <Icon name="grid_view" size="sm" />
          Evaluación · {periodo}.º periodo
        </span>
        {calculada ? (
          <span className={styles.calculada} title="Sale de sus competencias dependientes; no se pone a mano.">
            {etiquetaNivel(valor) || 'Sin evaluar'} · calculada
          </span>
        ) : (
          <select
            className={styles.selector}
            value={String(valor ?? '')}
            disabled={guardando}
            onChange={(e) => void guardar({ valor: e.target.value })}
          >
            {opcionesEvaluacion(competencia.admitePenalizacion).map((opt) => (
              <option key={opt.label} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
        {guardando && <span className={styles.guardando}>Guardando…</span>}
      </div>

      <label className={styles.campoRetro}>
        <span className={styles.etiquetaRetro}>
          Retroalimentación
          <span className={styles.aclaracion}>la lee el alumno</span>
        </span>
        <textarea
          className={styles.retro}
          rows={2}
          value={borrador}
          disabled={guardando}
          placeholder="Qué le falta para el siguiente nivel…"
          onChange={(e) => setBorrador(e.target.value)}
          onBlur={() => {
            if (borrador === guardado.current) return;
            guardado.current = borrador;
            void guardar({ retro: borrador });
          }}
        />
      </label>

      {sancionada && (
        <p className={styles.avisoSancion}>
          <Icon name="gavel" size="sm" />
          Resta 30 puntos a la nota del periodo. La retroalimentación es la que la sostiene.
        </p>
      )}
      {error && (
        <p className={styles.error}>
          <Icon name="error" size="sm" />
          {error}
        </p>
      )}
    </div>
  );
}
