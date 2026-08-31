import { useMemo } from 'react';
import type { CorteBurndown } from '../../../../utils/scrum';
import styles from './Burndown.module.css';

interface Props {
  titulo: string;
  /**
   * La serie completa, empezando por el compromiso. El primer corte de un
   * sprint es «Compromiso» y lo pone el servidor al cerrarse el planning.
   */
  cortes: CorteBurndown[];
  /** Puntos comprometidos al empezar. De ahí baja la línea ideal hasta cero. */
  planeados: number;
  /**
   * Sobre cuántos hitos baja la ideal. Es el ciclo completo del sprint y se fija
   * al comprometerse, no crece con los cortes que se vayan tomando: si creciera,
   * su pendiente dependería de cuántas veces cambiara de etapa el profesor.
   */
  pasos?: number;
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
 * El eje X no es el tiempo, son HITOS: un punto por cada cambio de etapa —más
 * el compromiso al principio y el cierre al final—. Un sprint de la dinámica
 * dura tres minutos, así que una curva por segundos no diría nada, y un punto
 * por ritual es exactamente el ritmo al que la actividad pide «actualicen su
 * burndown chart».
 *
 * La ideal va del compromiso a cero sobre el ciclo ENTERO, aunque todavía no se
 * haya llegado: por eso la línea real avanza por debajo y se ve cuánto falta.
 */
export default function Burndown({
  titulo, cortes, planeados, pasos, nota, secundario,
}: Props) {
  const { real, ideal, total, max } = useMemo(() => {
    // Sin ningún corte todavía, el compromiso es todo lo que hay que enseñar.
    // Y si la serie no arranca en el compromiso —los sprints que se jugaron
    // antes de que el primer corte fuera ese— se le pone delante, para que al
    // menos empiece donde empezó el trabajo.
    const conCompromiso = cortes.length > 0 && cortes[0].etiqueta === 'Compromiso';
    const serie = cortes.length === 0
      ? [planeados]
      : (conCompromiso ? cortes.map((c) => c.restantes) : [planeados, ...cortes.map((c) => c.restantes)]);
    // La ideal baja del compromiso a cero en los pasos del ciclo, y AHÍ SE
    // QUEDA. Si el equipo da más vueltas de las previstas —volver al planning a
    // mitad del sprint, repetir el desarrollo—, la gráfica se ensancha pero la
    // ideal no se estira con ella: sigue en cero, que es donde tendrían que
    // estar. Estirarla era lo que hacía que dar vueltas pareciera ir bien.
    // Sin `pasos` —los sprints que se jugaron antes de que se guardara— la
    // ideal se reparte entre los cortes que haya, que es como se dibujaba
    // antes: no se puede saber qué ciclo tenían.
    const ciclo = Math.max(pasos || serie.length, 2);
    const n = Math.max(ciclo, serie.length);
    const linea = Array.from({ length: n }, (_, i) => (
      i >= ciclo - 1 ? 0 : planeados * (1 - i / (ciclo - 1))
    ));
    return { real: serie, ideal: linea, total: n, max: Math.max(...serie, planeados, 1) };
  }, [cortes, planeados, pasos]);

  const ancho = 280;
  const alto = 96;
  // Las dos líneas comparten escala: la real ocupa los hitos que ya pasaron y
  // la ideal, el ciclo entero. Escalando cada una a su propio largo, un sprint
  // a medias parecía terminado.
  const px = (i: number) => 4 + (i * (ancho - 8)) / Math.max(total - 1, 1);
  const py = (v: number) => alto - 6 - (v / max) * (alto - 16);
  const camino = (datos: number[]) => datos.map((v, i) => `${px(i)},${py(v)}`).join(' ');

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
          <circle key={i} cx={px(i)} cy={py(v)} r="3" className={styles.punto} />
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
