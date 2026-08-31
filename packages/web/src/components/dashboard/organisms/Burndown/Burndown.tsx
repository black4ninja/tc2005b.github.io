import { useMemo } from 'react';
import type { CorteBurndown } from '../../../../utils/scrum';
import styles from './Burndown.module.css';

interface Props {
  titulo: string;
  /** Los cortes que se tomaron: uno por cambio de etapa y otro al cerrar. */
  cortes: CorteBurndown[];
  /** Puntos comprometidos al empezar. De ahí baja la línea ideal hasta cero. */
  planeados: number;
  nota?: string;
  /** El del proyecto va en gris para no competir con el del sprint. */
  secundario?: boolean;
}

/**
 * Un burndown: cuántos puntos QUEDAN por cerrar.
 *
 * La línea gris es lo ideal y la de color lo real. No hace falta explicar más:
 * si la de color va por encima, van tarde.
 *
 * Se dibuja con los cortes que se tomaron en cada cambio de etapa y no como una
 * función continua del tiempo: un sprint de la dinámica dura tres minutos, así
 * que una curva por segundos no diría nada. Un corte por etapa es exactamente el
 * ritmo al que la actividad pide «actualicen su burndown chart».
 */
export default function Burndown({ titulo, cortes, planeados, nota, secundario }: Props) {
  const { real, ideal, max } = useMemo(() => {
    const puntos = cortes.map((c) => c.restantes);
    // El primer punto es lo comprometido: sin él la gráfica empieza donde ya
    // habían avanzado y parece que nunca hubo nada que hacer.
    const serie = puntos.length > 0 ? [planeados, ...puntos] : [planeados];
    const n = Math.max(serie.length, 2);
    const linea = Array.from({ length: n }, (_, i) => planeados * (1 - i / (n - 1)));
    return { real: serie, ideal: linea, max: Math.max(...serie, planeados, 1) };
  }, [cortes, planeados]);

  const ancho = 280;
  const alto = 96;
  const px = (i: number, n: number) => 4 + (i * (ancho - 8)) / Math.max(n - 1, 1);
  const py = (v: number) => alto - 6 - (v / max) * (alto - 16);
  const camino = (datos: number[]) =>
    datos.map((v, i) => `${px(i, datos.length)},${py(v)}`).join(' ');

  const restantes = real[real.length - 1] ?? 0;

  return (
    <div className={`${styles.caja} ${secundario ? styles.secundario : ''}`}>
      <div className={styles.cabecera}>
        <span className={styles.titulo}>{titulo}</span>
        <span className={styles.cifra}>
          {restantes}
          <span className={styles.unidad}> pts por cerrar</span>
        </span>
      </div>

      <svg
        className={styles.grafica}
        viewBox={`0 0 ${ancho} ${alto}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${titulo}: quedan ${restantes} puntos de ${planeados}`}
      >
        <line x1="4" y1={alto - 6} x2={ancho - 4} y2={alto - 6} className={styles.eje} />
        <polyline points={camino(ideal)} className={styles.ideal} />
        <polyline points={camino(real)} className={styles.real} />
        {real.map((v, i) => (
          <circle key={i} cx={px(i, real.length)} cy={py(v)} r="3" className={styles.punto} />
        ))}
      </svg>

      <div className={styles.leyenda}>
        <span className={styles.clave}><span className={styles.muestraReal} />real</span>
        <span className={styles.clave}><span className={styles.muestraIdeal} />ideal</span>
      </div>

      {nota && <p className={styles.nota}>{nota}</p>}
    </div>
  );
}
