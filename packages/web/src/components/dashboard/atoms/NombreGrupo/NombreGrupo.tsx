import { partirNombreGrupo } from '../../../../utils/nombreGrupo';
import styles from './NombreGrupo.module.css';

/** Categoría desplegada tal y como la manda la API dentro del grupo. */
export interface CategoriaRef {
  id: string;
  nombre: string;
  /** Hex ya normalizado (`#rrggbb`) por la API. */
  color: string;
}

interface NombreGrupoProps {
  nombre: string;
  categoria?: CategoriaRef | null;
  /** Añade el nombre de la categoría detrás. Off en sitios estrechos. */
  mostrarCategoria?: boolean;
  /** `barra` para listas (franja lateral), `punto` para líneas sueltas. */
  marca?: 'barra' | 'punto';
}

/**
 * Nombre de un grupo con su color y la sección destacada.
 *
 * Las dos mitades resuelven confusiones distintas y por eso están las dos: el
 * COLOR separa materias entre sí (Móviles de Gráficas), y la SECCIÓN separa dos
 * grupos de la misma materia (101 de 102), que comparten color justamente por
 * ser la misma. Con solo color, 101 y 102 seguirían siendo indistinguibles.
 *
 * Un grupo sin categoría se pinta en gris heredado del tema, no en un color
 * inventado: que se note que le falta clasificar.
 */
export default function NombreGrupo({
  nombre,
  categoria,
  mostrarCategoria = false,
  marca = 'punto',
}: NombreGrupoProps) {
  const { prefijo, seccion } = partirNombreGrupo(nombre);
  const color = categoria?.color;

  return (
    <span className={styles.envoltorio}>
      <span
        className={marca === 'barra' ? styles.barra : styles.punto}
        // El color es dato, no diseño: no puede vivir en la hoja de estilos.
        // La API solo deja pasar `#rrggbb` (ver `normalizarColor`).
        style={color ? { background: color } : undefined}
        // Decorativo: el nombre del grupo ya va escrito al lado. Anunciarlo
        // haría que el lector de pantalla leyera un color sin más contexto.
        aria-hidden="true"
      />
      <span className={styles.texto}>
        <span className={styles.prefijo}>{prefijo}</span>
        {seccion && <span className={styles.seccion}>{seccion}</span>}
      </span>
      {mostrarCategoria && categoria && (
        <span className={styles.categoria}>{categoria.nombre}</span>
      )}
    </span>
  );
}
