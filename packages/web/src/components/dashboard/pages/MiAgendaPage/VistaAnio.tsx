import { diasDeMes, type EventoAgenda } from '../../../../utils/miAgenda';
import styles from './VistaAnio.module.css';

const INICIALES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

interface Props {
  anio: string;
  eventos: EventoAgenda[];
  hoy: string;
  enChoque: Set<string>;
  nombre: Map<string, string>;
  color: (ev: EventoAgenda) => string;
  onDia: (fecha: string) => void;
}

/**
 * El año en doce meses chicos. Cada día con algo lleva un punto por color
 * (hasta tres) y un anillo rojo si algo se traslapa; tocarlo abre ese día.
 */
export default function VistaAnio({ anio, eventos, hoy, enChoque, nombre, color, onDia }: Props) {
  const porDia = new Map<string, EventoAgenda[]>();
  for (const e of eventos) porDia.set(e.fecha, [...(porDia.get(e.fecha) ?? []), e]);

  return (
    <div className={styles.anio}>
      {Array.from({ length: 12 }, (_, m) => {
        const primero = `${anio}-${String(m + 1).padStart(2, '0')}-01`;
        const mes = primero.slice(0, 7);
        const titulo = new Date(`${primero}T12:00:00Z`).toLocaleDateString('es-MX', { timeZone: 'UTC', month: 'long' });
        return (
          <section key={mes} className={styles.mes} aria-label={titulo}>
            <h3 className={styles.titulo}>{titulo}</h3>
            <div className={styles.rejilla}>
              {INICIALES.map((d, i) => <span key={i} className={styles.inicial}>{d}</span>)}
              {diasDeMes(primero).map((d) => {
                if (d.slice(0, 7) !== mes) return <span key={d} />;
                const lista = porDia.get(d) ?? [];
                const colores = [...new Set(lista.map(color))].slice(0, 3);
                const choca = lista.some((e) => enChoque.has(e.id));
                const resumen = lista.map((e) => `${e.inicio} ${nombre.get(e.grupoId) ?? ''} (${e.tipo === 'sesion' ? 'sesión' : 'entrevistas'})`).join(', ');
                return (
                  <button
                    key={d}
                    type="button"
                    className={`${styles.dia} ${d === hoy ? styles.hoy : ''} ${choca ? styles.choque : ''} ${lista.length ? styles.conEventos : ''}`}
                    onClick={() => onDia(d)}
                    title={resumen || undefined}
                    aria-label={`${Number(d.slice(8))} de ${titulo}${resumen ? `: ${resumen}` : ''}${choca ? '. Hay traslapes' : ''}`}
                  >
                    <span>{Number(d.slice(8))}</span>
                    <span className={styles.puntos}>
                      {colores.map((c) => <i key={c} style={{ background: c }} />)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
