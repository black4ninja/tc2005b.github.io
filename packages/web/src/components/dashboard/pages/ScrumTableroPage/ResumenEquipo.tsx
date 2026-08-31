import Burndown from '../../organisms/Burndown/Burndown';
import { iniciales, type Marcador, type Persona, type TarjetaRetro } from '../../../../utils/scrum';
import styles from './ResumenEquipo.module.css';

export interface DatosResumen {
  equipo: { nombre: string; miembros: Persona[] } | null;
  historico: Marcador[];
  sinEmpezar: { que: string; puntos: number; prioridad: string }[];
  porIntegrante: { id: string; name: string; puntos: number }[];
  sinResponsable: number;
  compromisos: TarjetaRetro[];
}

/**
 * Lo que el equipo se lleva al terminar la dinámica.
 *
 * No es un marcador: es la respuesta a las preguntas con las que termina la
 * sesión —¿para qué sirvió planear?, ¿cómo afecta la deuda técnica?—. Por eso
 * cada cifra viene con lo que significa en vez de un número suelto, y por eso el
 * sprint donde peor les fue se señala en el texto: es de donde se aprende.
 */
export default function ResumenEquipo({ datos }: { datos: DatosResumen }) {
  const { historico, porIntegrante, sinEmpezar, sinResponsable, compromisos } = datos;

  const cerrados = historico.reduce((t, m) => t + m.cerrados, 0);
  const planeados = historico.reduce((t, m) => t + m.planeados, 0);
  const bloqueo = historico.reduce((t, m) => t + m.bloqueo, 0);
  const devueltos = historico.reduce((t, m) => t + m.devueltos, 0);
  const cumplidos = compromisos.filter((c) => c.estado === 'cumplido').length;
  const marcados = compromisos.filter((c) => c.estado !== null).length;
  const porcentaje = planeados > 0 ? Math.round((cerrados / planeados) * 100) : 0;

  // El sprint del que más se aprende: el que más lejos quedó de lo prometido.
  const peor = [...historico]
    .filter((m) => m.planeados > 0)
    .sort((a, b) => (b.planeados - b.cerrados) - (a.planeados - a.cerrados))[0];

  const maxIntegrante = Math.max(1, ...porIntegrante.map((p) => p.puntos));

  /**
   * El burndown del PROYECTO no se puede apoyar en lo planeado sprint a sprint:
   * lo que la deuda devuelve al backlog se vuelve a comprometer, así que el
   * mismo trabajo contaría dos o tres veces y la gráfica arrancaría de un total
   * que nunca existió. La base es el trabajo conocido de verdad: lo cerrado,
   * más lo que quedó abierto al final, más lo que nunca salió del backlog.
   */
  const abiertoAlFinal = historico[historico.length - 1]?.abiertosPts ?? 0;
  const pendienteBacklog = sinEmpezar.reduce((t, h) => t + Math.max(0, h.puntos), 0);
  const totalProyecto = cerrados + abiertoAlFinal + pendienteBacklog;

  const cortesProyecto = historico.map((m) => ({
    en: '',
    etiqueta: `Sprint ${m.numero ?? ''}`,
    restantes: Math.max(0, totalProyecto - historico
      .filter((x) => (x.numero ?? 0) <= (m.numero ?? 0))
      .reduce((t, x) => t + x.cerrados, 0)),
  }));

  return (
    <div className={styles.resumen}>
      <div className={styles.cifras}>
        <Cifra valor={String(cerrados)} etiqueta="puntos cerrados" tono="ok"
          detalle={`De ${planeados} que llegaron a comprometerse`} />
        <Cifra valor={`${porcentaje} %`} etiqueta="de lo comprometido"
          detalle="Lo que planearon frente a lo que cerraron" />
        <Cifra valor={String(bloqueo)} etiqueta="puntos de bloqueo" tono="mal"
          detalle="Historias sin terminar más restricciones incumplidas" />
        <Cifra valor={String(devueltos)} etiqueta="puntos rehechos" tono="mal"
          detalle="Trabajo que la deuda devolvió al backlog" />
        <Cifra valor={`${cumplidos} / ${marcados || compromisos.length}`}
          etiqueta="compromisos cumplidos"
          detalle="De las retrospectivas de todos los sprints" />
      </div>

      <div className={styles.columnas}>
        <div className={styles.principal}>
          <section className={styles.caja}>
            <div className={styles.cajaCabecera}>
              <span className={styles.cajaTitulo}>Sprint a sprint</span>
              <span className={styles.cajaNota}>puntos</span>
            </div>
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th />
                  <th>Planeado</th>
                  <th>Cerrado</th>
                  <th>Sin cerrar</th>
                  <th>Penaliz.</th>
                  <th>Bloqueo</th>
                  <th>Devueltos</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((m) => (
                  <tr key={m.id}>
                    <td className={styles.sprintNombre}>Sprint {m.numero}</td>
                    <td>{m.planeados}</td>
                    <td className={styles.bien}>{m.cerrados}</td>
                    <td>{m.abiertosPts}</td>
                    <td>{m.penalizaciones}</td>
                    <td className={m.bloqueo > 0 ? styles.mal : styles.apagado}>{m.bloqueo}</td>
                    <td className={m.devueltos > 0 ? styles.mal : styles.apagado}>
                      {m.devueltos || '—'}
                    </td>
                  </tr>
                ))}
                {historico.length === 0 && (
                  <tr><td colSpan={7} className={styles.apagado}>Sin sprints cerrados.</td></tr>
                )}
              </tbody>
            </table>
            {peor && peor.planeados > peor.cerrados && (
              <p className={styles.lectura}>
                El <strong>Sprint {peor.numero}</strong> es la lección: planearon {peor.planeados} y
                cerraron {peor.cerrados}, así que el siguiente arrancó devolviendo puntos al
                backlog. La deuda no se paga cuando se decide, se paga cuando toca volver a planear.
              </p>
            )}
          </section>

          <section className={styles.caja}>
            <span className={styles.cajaTitulo}>Quién cerró qué</span>
            <div className={styles.barras}>
              {porIntegrante.map((p) => (
                <div key={p.id} className={styles.barraFila}>
                  <span className={styles.avatar}>{iniciales(p.name)}</span>
                  <span className={styles.barraNombre}>{p.name}</span>
                  <span className={styles.barra}>
                    <span
                      className={styles.barraLlena}
                      style={{ width: `${(p.puntos / maxIntegrante) * 100}%` }}
                    />
                  </span>
                  <span className={p.puntos === 0 ? styles.apagado : styles.barraCifra}>
                    {p.puntos} pts
                  </span>
                </div>
              ))}
            </div>
            <p className={styles.lectura}>
              <strong>Si una historia es de todos a la vez, no es de nadie.</strong> Aquí solo
              cuenta lo que estaba asignado al cerrarse
              {sinResponsable > 0
                ? `: ${sinResponsable} ${sinResponsable === 1 ? 'historia se cerró' : 'historias se cerraron'} sin responsable y no le sumaron a ninguno.`
                : '. Todas tenían responsable.'}
            </p>
          </section>
        </div>

        <aside className={styles.lateral}>
          <Burndown
            titulo="Todo el proyecto"
            cortes={cortesProyecto}
            planeados={totalProyecto}
            nota="La distancia con la línea gris es lo que costó la deuda."
            secundario
          />

          <section className={styles.caja}>
            <span className={styles.cajaTitulo}>Se quedó en el camino</span>
            {sinEmpezar.length > 0 ? (
              <>
                <ul className={styles.pendientes}>
                  {sinEmpezar.slice(0, 6).map((h, i) => (
                    <li key={`${i}-${h.que}`}>
                      <span className={styles.punto} />
                      {h.que}
                    </li>
                  ))}
                </ul>
                <p className={styles.lectura}>
                  {sinEmpezar.length}{' '}
                  {sinEmpezar.length === 1 ? 'historia nunca salió' : 'historias nunca salieron'} del
                  backlog. Si eran <strong>could</strong> y <strong>won't</strong>, priorizar
                  funcionó.
                </p>
              </>
            ) : (
              <p className={styles.lectura}>No quedó nada en el backlog: se lo llevaron todo.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Cifra({
  valor, etiqueta, detalle, tono,
}: { valor: string; etiqueta: string; detalle: string; tono?: 'ok' | 'mal' }) {
  return (
    <div className={styles.cifra}>
      <div className={`${styles.cifraValor} ${tono ? styles[tono] : ''}`}>{valor}</div>
      <div className={styles.cifraEtiqueta}>{etiqueta}</div>
      <div className={styles.cifraDetalle}>{detalle}</div>
    </div>
  );
}
