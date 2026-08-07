import styles from './Icon.module.css';

interface IconProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Icono de Material Icons por ligadura: el texto del nodo ES el nombre del
 * icono.
 *
 * A propósito SIN `aria-hidden`. Sería la corrección de raíz para los botones de
 * solo icono —hoy su nombre accesible sale de la ligadura, que se anuncia como
 * «vertical_split»—, pero en esta base hay una veintena de controles cuyo único
 * contenido es este icono y ningún `aria-label`: marcarlo oculto los dejaría sin
 * nombre accesible, que es peor que uno malo. El arreglo correcto es poner
 * `aria-label` en cada control de solo icono y, cuando no quede ninguno sin él,
 * añadir aquí `aria-hidden="true"`.
 */
export default function Icon({ name, size = 'md', className = '' }: IconProps) {
  return (
    <span className={`material-icons ${styles.icon} ${styles[size]} ${className}`}>
      {name}
    </span>
  );
}
