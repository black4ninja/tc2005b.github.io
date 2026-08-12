import { useTema, type PreferenciaTema } from '../../../../context/TemaContext';
import styles from './SelectorTema.module.css';

const OPCIONES: { valor: PreferenciaTema; icono: string; etiqueta: string; ayuda: string }[] = [
  { valor: 'claro', icono: 'light_mode', etiqueta: 'Claro', ayuda: 'Siempre claro' },
  { valor: 'oscuro', icono: 'dark_mode', etiqueta: 'Oscuro', ayuda: 'Siempre oscuro' },
  { valor: 'auto', icono: 'computer', etiqueta: 'Auto', ayuda: 'Según tu sistema' },
];

/**
 * Elige el tema de la interfaz: claro, oscuro o el del sistema.
 *
 * Es un grupo de tres botones y no un interruptor de dos posiciones porque
 * «automático» es un estado propio, no un punto medio: no se puede representar
 * en algo que solo está encendido o apagado.
 */
export default function SelectorTema() {
  const { preferencia, cambiarTema } = useTema();

  return (
    <div className={styles.grupo} role="radiogroup" aria-label="Tema de la interfaz">
      <span className={styles.titulo}>Tema</span>
      <div className={styles.opciones}>
        {OPCIONES.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            role="radio"
            aria-checked={preferencia === opcion.valor}
            className={`${styles.opcion} ${preferencia === opcion.valor ? styles.opcionActiva : ''}`}
            onClick={() => cambiarTema(opcion.valor)}
            title={opcion.ayuda}
          >
            <span className="material-icons" aria-hidden="true">{opcion.icono}</span>
            {opcion.etiqueta}
          </button>
        ))}
      </div>
    </div>
  );
}
