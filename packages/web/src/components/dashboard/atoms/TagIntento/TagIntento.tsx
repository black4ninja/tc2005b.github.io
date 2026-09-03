import Icon from '../Icon/Icon';
import styles from './TagIntento.module.css';

interface Props {
  /** 1 o 2. Cualquier otro se pinta como el segundo. */
  intento: number;
  /** Icono a la izquierda, si el sitio necesita decir algo más («asignada»). */
  icono?: string;
}

/**
 * De qué entrevista es algo: 1.º o 2.º intento.
 *
 * Con color y no solo con el número. Cada competencia lleva dos entrevistas y
 * las dos aparecen juntas —en el selector de preguntas, en las notas—, así que
 * distinguirlas leyendo un «1» de un «2» es más trabajo del que hace falta: el
 * color se ve sin leer.
 *
 * El primero en verde y el segundo en ámbar, que es como se leen: el segundo es
 * la última oportunidad. Y con los tokens de estado enteros —fondo, borde y
 * texto—, no con el color de acento y texto blanco: en oscuro ese color es el
 * CLARO de la pareja, y blanco encima no se lee.
 */
export default function TagIntento({ intento, icono }: Props) {
  return (
    <span className={`${styles.tag} ${intento === 1 ? styles.primero : styles.segundo}`}>
      {icono && <Icon name={icono} size="sm" />}
      {intento}.º intento
    </span>
  );
}
