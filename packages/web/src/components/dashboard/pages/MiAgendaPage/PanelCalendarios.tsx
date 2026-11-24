import { useEffect, useRef } from 'react';
import Icon from '../../atoms/Icon/Icon';
import {
  coloresDe, grupoVisible, textoSobre,
  type GrupoAgenda, type PreferenciaGrupo, type TipoEvento,
} from '../../../../utils/miAgenda';
import styles from './PanelCalendarios.module.css';

interface Props {
  grupos: GrupoAgenda[];
  prefs: Record<string, PreferenciaGrupo>;
  indice: Map<string, number>;
  onCambiar: (cambios: Record<string, PreferenciaGrupo>) => void;
  onVerMenu: () => void;
}

const SECCIONES: { tipo: TipoEvento; titulo: string; ver: 'verSesiones' | 'verEntrevistas'; color: 'sesiones' | 'entrevistas' }[] = [
  { tipo: 'sesion', titulo: 'Sesiones', ver: 'verSesiones', color: 'sesiones' },
  { tipo: 'entrevista', titulo: 'Entrevistas', ver: 'verEntrevistas', color: 'entrevistas' },
];

/** Casilla cuyo estado puede ser «algunos sí»: el DOM no lo admite como atributo. */
function CasillaMaestra({ marcada, mixta, onCambiar, etiqueta }: {
  marcada: boolean; mixta: boolean; onCambiar: (v: boolean) => void; etiqueta: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = mixta; }, [mixta]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className={styles.maestra}
      checked={marcada}
      onChange={(e) => onCambiar(e.target.checked)}
      aria-label={etiqueta}
    />
  );
}

/**
 * Los calendarios de «Mi agenda», como en Apple Calendar: primero el TIPO
 * (Sesiones, Entrevistas) con una casilla que los enciende o apaga todos, y
 * debajo un calendario por grupo con su cuadro de color. El cuadro es la
 * casilla; el color se cambia con el pincel que aparece al pasar por la fila.
 */
export default function PanelCalendarios({ grupos, prefs, indice, onCambiar, onVerMenu }: Props) {
  return (
    <div className={styles.panel}>
      <div className={styles.cabecera}>
        <span className={styles.titulo}>
          <Icon name="calendar_month" size="sm" /> Mi agenda
        </span>
        <button type="button" className={styles.menu} onClick={onVerMenu} title="Ver el menú principal">
          <Icon name="menu" size="sm" />
          <span>Menú</span>
        </button>
      </div>

      {grupos.length === 0 && <p className={styles.vacio}>No tienes grupos activos.</p>}

      {grupos.length > 0 && SECCIONES.map((s) => {
        const visibles = grupos.filter((g) => grupoVisible(g, prefs[g.id], s.tipo));
        const todos = visibles.length === grupos.length;
        const fijarTodos = (ver: boolean) =>
          onCambiar(Object.fromEntries(grupos.map((g) => [g.id, { ...prefs[g.id], [s.ver]: ver }])));
        return (
          <section key={s.tipo} className={styles.seccion}>
            <label className={styles.seccionTitulo}>
              <CasillaMaestra
                marcada={todos}
                mixta={visibles.length > 0 && !todos}
                onCambiar={fijarTodos}
                etiqueta={`Ver todas las ${s.titulo.toLowerCase()}`}
              />
              <span>{s.titulo}</span>
            </label>
            <ul className={styles.lista}>
              {grupos.map((g) => {
                const color = coloresDe(indice.get(g.id) ?? 0, prefs[g.id])[s.color];
                const visible = grupoVisible(g, prefs[g.id], s.tipo);
                const cambiar = (cambio: PreferenciaGrupo) => onCambiar({ [g.id]: { ...prefs[g.id], ...cambio } });
                return (
                  <li key={g.id} className={styles.fila}>
                    <label className={styles.calendario}>
                      <input
                        type="checkbox"
                        className={styles.oculta}
                        checked={visible}
                        onChange={(e) => cambiar({ [s.ver]: e.target.checked })}
                      />
                      <span
                        className={styles.cuadro}
                        style={{ '--c': color, '--c-texto': textoSobre(color) } as React.CSSProperties}
                        aria-hidden="true"
                      />
                      <span className={styles.nombre} title={g.name}>{g.name}</span>
                    </label>
                    <label className={styles.pincel} title={`Cambiar el color de las ${s.titulo.toLowerCase()} de ${g.name}`}>
                      <Icon name="palette" size="sm" />
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => cambiar({ [s.color]: e.target.value })}
                        aria-label={`Color de las ${s.titulo.toLowerCase()} de ${g.name}`}
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
