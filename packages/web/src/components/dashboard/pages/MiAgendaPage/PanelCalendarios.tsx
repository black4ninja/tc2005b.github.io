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

interface Calendario {
  tipo: TipoEvento;
  nombre: string;
  icono: string;
  ver: 'verSesiones' | 'verEntrevistas';
  color: 'sesiones' | 'entrevistas';
}

const CALENDARIOS: Calendario[] = [
  { tipo: 'sesion', nombre: 'Calendario', icono: 'calendar_month', ver: 'verSesiones', color: 'sesiones' },
  { tipo: 'entrevista', nombre: 'Entrevistas', icono: 'record_voice_over', ver: 'verEntrevistas', color: 'entrevistas' },
];

/** Los calendarios que tiene un grupo. Sin el dato (respuesta antigua), los dos. */
function calendariosDe(g: GrupoAgenda): Calendario[] {
  return CALENDARIOS.filter((c) => (c.tipo === 'sesion' ? g.tieneSesiones : g.tieneEntrevistas) !== false);
}

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
 * Los calendarios de «Mi agenda», agrupados POR GRUPO, como las cuentas de
 * Apple Calendar: el grupo con una casilla que enciende o apaga todo lo suyo, y
 * debajo sus calendarios —«Calendario» (las sesiones) y «Entrevistas»—, solo
 * los que tiene. Cada uno con su cuadro de color, que es la casilla; el color se
 * cambia con el pincel que aparece al pasar por la fila.
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

      {grupos.map((g) => {
        const propios = calendariosDe(g);
        const visibles = propios.filter((c) => grupoVisible(g, prefs[g.id], c.tipo));
        const todos = propios.length > 0 && visibles.length === propios.length;
        const fijarTodos = (ver: boolean) =>
          onCambiar({ [g.id]: { ...prefs[g.id], ...Object.fromEntries(propios.map((c) => [c.ver, ver])) } });
        return (
          <section key={g.id} className={styles.seccion}>
            <label className={`${styles.seccionTitulo} ${propios.length === 0 ? styles.sinCalendarios : ''}`}>
              {propios.length > 0 && (
                <CasillaMaestra
                  marcada={todos}
                  mixta={visibles.length > 0 && !todos}
                  onCambiar={fijarTodos}
                  etiqueta={`Ver todo lo de ${g.name}`}
                />
              )}
              <span className={styles.nombreGrupo} title={g.name}>{g.name}</span>
            </label>
            {propios.length === 0 ? (
              <p className={styles.nota}>Sin calendario ni entrevistas</p>
            ) : (
              <ul className={styles.lista}>
                {propios.map((c) => {
                  const color = coloresDe(indice.get(g.id) ?? 0, prefs[g.id])[c.color];
                  const visible = grupoVisible(g, prefs[g.id], c.tipo);
                  const cambiar = (cambio: PreferenciaGrupo) => onCambiar({ [g.id]: { ...prefs[g.id], ...cambio } });
                  return (
                    <li key={c.tipo} className={styles.filaConSub}>
                    <div className={styles.fila}>
                      <label className={styles.calendario}>
                        <input
                          type="checkbox"
                          className={styles.oculta}
                          checked={visible}
                          onChange={(e) => cambiar({ [c.ver]: e.target.checked })}
                          aria-label={`${c.nombre} de ${g.name}`}
                        />
                        <span
                          className={styles.cuadro}
                          style={{ '--c': color, '--c-texto': textoSobre(color) } as React.CSSProperties}
                          aria-hidden="true"
                        />
                        <span className={styles.nombre}>{c.nombre}</span>
                      </label>
                      <label className={styles.pincel} title={`Cambiar el color de ${c.nombre.toLowerCase()} de ${g.name}`}>
                        <Icon name="palette" size="sm" />
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => cambiar({ [c.color]: e.target.value })}
                          aria-label={`Color de ${c.nombre.toLowerCase()} de ${g.name}`}
                        />
                      </label>
                    </div>
                    {/* Con quién imparte asignado, cada quien ve solo sus sesiones
                        salvo que pida ver también las de los demás. */}
                    {c.tipo === 'sesion' && g.conImparten && visible && (
                      <label className={styles.subOpcion}>
                        <input
                          type="checkbox"
                          checked={prefs[g.id]?.soloMias !== false}
                          onChange={(e) => cambiar({ soloMias: e.target.checked })}
                        />
                        Solo las que imparto
                      </label>
                    )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
