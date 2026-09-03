import { useMemo, useState } from 'react';
import Icon from '../../atoms/Icon/Icon';
import { useClickOutside } from '../../../../hooks/useClickOutside';
import {
  INICIALES_SEMANA, claveLocal, fechaCorta, nombreMes, semanasDelMes,
} from '../../../../utils/agenda';
import styles from './SelectorDias.module.css';

interface Props {
  /** Las fechas picadas, en `yyyy-mm-dd`. */
  fechas: string[];
  deshabilitado?: boolean;
  onCambiar: (fechas: string[]) => void;
}

/** `2026-09-07` → un `Date` local, sin que la zona lo corra un día. */
function aFecha(clave: string): Date {
  const [a, m, d] = clave.split('-').map(Number);
  return new Date(a, m - 1, d);
}

/**
 * Picar los días de un horario en un calendario.
 *
 * Antes esto era un rango de fechas cruzado con los días de la semana —«del 7 al
 * 18, martes y jueves»—, y el profesor tenía que traducir las fechas que tenía
 * en la cabeza a una regla que las produjera. Si quería el 7, el 8 y el 9 y
 * además el 15, no había manera de decirlo en un solo horario.
 *
 * Aquí se pican y ya. El calendario se queda abierto mientras se eligen: elegir
 * tres días son tres clics, y cerrarse en el primero obligaba a reabrirlo por
 * cada uno.
 */
export default function SelectorDias({ fechas, deshabilitado = false, onCambiar }: Props) {
  const [abierto, setAbierto] = useState(false);
  const caja = useClickOutside<HTMLDivElement>(() => setAbierto(false));

  const hoy = useMemo(() => claveLocal(new Date()), []);
  // El mes que se enseña al abrir: el de la primera fecha picada, o el de hoy.
  const [mes, setMes] = useState(() => {
    const base = fechas.length > 0 ? aFecha([...fechas].sort()[0]) : new Date();
    return { anio: base.getFullYear(), mes: base.getMonth() };
  });

  const semanas = useMemo(() => semanasDelMes(mes.anio, mes.mes), [mes]);
  const elegidas = useMemo(() => new Set(fechas), [fechas]);
  const ordenadas = useMemo(() => [...fechas].sort(), [fechas]);

  function alternar(clave: string) {
    onCambiar(elegidas.has(clave)
      ? fechas.filter((f) => f !== clave)
      : [...fechas, clave]);
  }

  function mover(paso: number) {
    setMes(({ anio, mes: m }) => {
      const d = new Date(anio, m + paso, 1);
      return { anio: d.getFullYear(), mes: d.getMonth() };
    });
  }

  return (
    <div className={styles.caja} ref={caja}>
      <button
        type="button"
        className={styles.disparador}
        disabled={deshabilitado}
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
      >
        <Icon name="calendar_today" size="sm" />
        {ordenadas.length === 0
          ? <span className={styles.vacio}>Elige los días…</span>
          : (
            <span className={styles.elegidas}>
              {ordenadas.slice(0, 3).map((f) => (
                <span key={f} className={styles.pastilla}>{fechaCorta(`${f}T12:00:00`)}</span>
              ))}
              {ordenadas.length > 3 && (
                <span className={styles.mas}>+{ordenadas.length - 3}</span>
              )}
            </span>
          )}
        <Icon name="expand_more" size="sm" />
      </button>

      {abierto && (
        <div className={styles.panel}>
          <div className={styles.cabecera}>
            <button type="button" className={styles.flecha} onClick={() => mover(-1)} aria-label="Mes anterior">
              <Icon name="chevron_left" size="sm" />
            </button>
            <span className={styles.mes}>{nombreMes(mes.anio, mes.mes)}</span>
            <button type="button" className={styles.flecha} onClick={() => mover(1)} aria-label="Mes siguiente">
              <Icon name="chevron_right" size="sm" />
            </button>
          </div>

          <div className={styles.rejilla}>
            {INICIALES_SEMANA.map((letra, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <span key={i} className={styles.inicial}>{letra}</span>
            ))}
            {semanas.flat().map((d) => {
              // Los días pasados no se ofrecen: abrir entrevistas para ayer no
              // es algo que nadie quiera, y ocupan sitio en la rejilla.
              const pasado = d.clave < hoy;
              return (
                <button
                  key={d.clave}
                  type="button"
                  className={[
                    styles.dia,
                    elegidas.has(d.clave) ? styles.diaElegido : '',
                    d.delMes ? '' : styles.diaFuera,
                    d.clave === hoy ? styles.diaHoy : '',
                  ].filter(Boolean).join(' ')}
                  disabled={pasado}
                  onClick={() => alternar(d.clave)}
                >
                  {d.dia}
                </button>
              );
            })}
          </div>

          <div className={styles.pie}>
            <span className={styles.cuenta}>
              {ordenadas.length === 0
                ? 'Ninguno elegido'
                : `${ordenadas.length} día${ordenadas.length === 1 ? '' : 's'}`}
            </span>
            {ordenadas.length > 0 && (
              <button type="button" className={styles.limpiar} onClick={() => onCambiar([])}>
                Quitar todos
              </button>
            )}
            <button type="button" className={styles.listo} onClick={() => setAbierto(false)}>
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
