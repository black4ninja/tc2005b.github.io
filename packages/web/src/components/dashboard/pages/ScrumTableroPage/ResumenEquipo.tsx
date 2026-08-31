import Burndown from '../../organisms/Burndown/Burndown';
import {
  iniciales, serieProyecto, type Marcador, type Persona, type TarjetaRetro,
} from '../../../../utils/scrum';
import styles from './ResumenEquipo.module.css';

export interface DatosResumen {
  equipo: { nombre: string; miembros: Persona[] } | null;
  historico: Marcador[];
  sinEmpezar: { porQue: string; puntos: number; prioridad: string }[];
  porIntegrante: { id: string; name: string; puntos: number }[];
  sinResponsable: number;
  compromisos: TarjetaRetro[];
}

/** Lo que hay que leer en el burndown de un sprint, dicho en una frase. */
function notaSprint(m: Marcador): string {
  const sinCerrar = Math.max(0, m.planeados - m.cerrados);
  if (m.planeados === 0) return 'No llegaron a comprometer nada en este sprint.';
  if (sinCerrar === 0) return `Cerraron los ${m.planeados} puntos que se comprometieron.`;
  return `Se comprometieron a ${m.planeados} y cerraron ${m.cerrados}: `
    + `${sinCerrar} ${sinCerrar === 1 ? 'punto se quedó' : 'puntos se quedaron'} sin terminar.`;
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

  const pendienteBacklog = sinEmpezar.reduce((t, h) => t + Math.max(0, h.puntos), 0);
  const { cortes: cortesProyecto, total: totalProyecto } = serieProyecto(historico, pendienteBacklog);

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
            // Un paso por sprint: la ideal del proyecto baja parejo de sprint
            // en sprint hasta cero en el último.
            pasos={cortesProyecto.length}
            nota="La distancia con la línea gris es lo que costó la deuda."
            secundario
          />

          {/* Y el de cada sprint por separado. El del proyecto dice si llegaron;
              estos dicen CÓMO fue cada iteración, que es lo que se compara en la
              retrospectiva: el que se despeñó y el que bajó parejo no se
              distinguen en la suma. */}
          {historico.map((m) => (
            <Burndown
              key={m.id}
              titulo={`Sprint ${m.numero ?? ''}${m.objetivo ? ` · ${m.objetivo}` : ''}`}
              cortes={m.cortes}
              planeados={m.planeados}
              pasos={m.pasos}
              nota={notaSprint(m)}
            />
          ))}

          <section className={styles.caja}>
            <span className={styles.cajaTitulo}>Se quedó en el camino</span>
            {sinEmpezar.length > 0 ? (
              <>
                <ul className={styles.pendientes}>
                  {sinEmpezar.slice(0, 6).map((h, i) => (
                    <li key={`${i}-${h.porQue}`}>
                      <span className={styles.punto} />
                      {h.porQue}
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
