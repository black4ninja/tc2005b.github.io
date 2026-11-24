import Icon from '../../atoms/Icon/Icon';
import { diasDeMes, type EventoAgenda } from '../../../../utils/miAgenda';
import styles from './VistaMes.module.css';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MAX_POR_DIA = 3;

interface Props {
  fecha: string;
  eventos: EventoAgenda[];
  hoy: string;
  enChoque: Set<string>;
  nombre: Map<string, string>;
  color: (ev: EventoAgenda) => string;
  onAbrir: (ev: EventoAgenda) => void;
  onDia: (fecha: string) => void;
}

/**
 * El mes como Google Calendar: seis semanas, cada día con sus eventos como
 * renglones (punto de color, hora y grupo). Si no caben, «N más» lleva al día.
 */
export default function VistaMes({ fecha, eventos, hoy, enChoque, nombre, color, onAbrir, onDia }: Props) {
  const dias = diasDeMes(fecha);
  const mes = fecha.slice(0, 7);
  const porDia = new Map<string, EventoAgenda[]>();
  for (const e of eventos) porDia.set(e.fecha, [...(porDia.get(e.fecha) ?? []), e]);

  return (
    <div className={styles.mes}>
      {DIAS.map((d) => <div key={d} className={styles.cabecera}>{d}</div>)}
      {dias.map((d) => {
        const lista = porDia.get(d) ?? [];
        const fuera = d.slice(0, 7) !== mes;
        const sobran = lista.length - MAX_POR_DIA;
        return (
          <div key={d} className={`${styles.dia} ${fuera ? styles.fuera : ''}`}>
            <button
              type="button"
              className={`${styles.numero} ${d === hoy ? styles.hoy : ''}`}
              onClick={() => onDia(d)}
              aria-label={`Ver el ${Number(d.slice(8))} en la vista del día`}
            >
              {Number(d.slice(8))}
            </button>
            {/* En el celular no cabe texto: solo los puntos de color. */}
            <div className={styles.puntos} aria-hidden="true">
              {lista.slice(0, 4).map((e) => (
                <span key={e.id} style={{ background: color(e) }} className={enChoque.has(e.id) ? styles.puntoChoque : ''} />
              ))}
            </div>
            <ul className={styles.eventos}>
              {lista.slice(0, sobran > 0 ? MAX_POR_DIA - 1 : MAX_POR_DIA).map((e) => {
                const ocup = e.huecos ? ` · ${e.huecos.citas.length}/${e.huecos.total - e.huecos.cerrados.length}` : '';
                const texto = `${e.inicio} ${nombre.get(e.grupoId) ?? ''}`;
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      className={`${styles.evento} ${enChoque.has(e.id) ? styles.choque : ''}`}
                      onClick={() => onAbrir(e)}
                      title={`${nombre.get(e.grupoId)} · ${e.tipo === 'sesion' ? 'Sesión' : 'Entrevistas'} · ${e.inicio}–${e.fin}${ocup}${e.titulo ? ` · ${e.titulo}` : ''}`}
                    >
                      <span className={styles.punto} style={{ background: color(e) }} />
                      {enChoque.has(e.id) && <Icon name="warning" size="sm" />}
                      <span className={styles.texto}>{texto}{ocup}</span>
                    </button>
                  </li>
                );
              })}
              {sobran > 0 && (
                <li>
                  <button type="button" className={styles.mas} onClick={() => onDia(d)}>
                    {sobran + 1} más
                  </button>
                </li>
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
