import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { useAuth } from '../../context/AuthContext';
import { useCargaGated } from '../../hooks/useCargaGated';
import { useDiagramasBase } from '../../config/rutasDiagramas';
import { useDiagramas } from '../../lib/diagramas/useDiagramas';
import { etiquetaMotorDiagrama, etiquetaTipoDiagrama } from '../../lib/diagramas/etiquetas';
// La MISMA vista previa que ve quien redacta el ejercicio, no una copia: si el
// autor y el alumno dibujaran con componentes distintos, un diagrama podría
// verse bien al redactarlo y romperse al resolverlo sin que nadie lo notara.
import VistaPreviaDiagrama from '../dashboard/pages/EditorEjercicioDiagramaPage/VistaPreviaDiagrama';
import styles from './DiagramaSolver.module.css';

interface ContextoDTO {
  nombre: string;
  titulo: string;
  tipo: string;
  motor: string;
  codigo: string;
}

interface ComprobacionVisible {
  indice: number;
  comprobacion: string;
}

interface EjercicioDTO {
  id: string;
  titulo: string;
  slug: string;
  enunciadoHtml: string;
  motor: string;
  tipoDiagrama: string;
  codigoInicial: string;
  /** Material del enunciado: sin él no se puede resolver un ejercicio cruzado. */
  diagramasContexto: ContextoDTO[];
  comprobacionesVisibles: ComprobacionVisible[];
  comprobacionesOcultas: number;
  /** Ejemplo resuelto: abre con el diagrama ya completo. */
  esEjemplo?: boolean;
}

interface ResultadoAsercion {
  indice: number;
  oculta: boolean;
  paso: boolean;
  comprobacion: string;
  /** El servidor lo omite en las ocultas: se sabe QUE falló, no POR QUÉ. */
  detalle?: string;
}

interface ResultadoDiagrama {
  veredicto: string;
  errorSintaxis?: string;
  asercionesPasadas: number;
  asercionesTotales: number;
  aserciones: ResultadoAsercion[];
}

interface EnvioLista {
  id: string;
  veredicto: string;
  asercionesPasadas: number;
  asercionesTotales: number;
  createdAt: string;
}

const VEREDICTO_LABEL: Record<string, string> = {
  aceptado: 'Aceptado',
  error_sintaxis: 'Error de sintaxis',
  aserciones_fallidas: 'Comprobaciones sin superar',
};

const FECHA = new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' });

/** Concordancia en singular/plural, para no recurrir a la forma "(s)". */
function plural(n: number, singular: string, pluralForma: string): string {
  return n === 1 ? `${n} ${singular}` : `${n} ${pluralForma}`;
}

export default function DiagramaSolverPage() {
  const { slug, ejSlug } = useParams<{ slug: string; ejSlug: string }>();
  const { sessionToken } = useAuth();
  // Aquí el "volver" SÍ corresponde: el solver cuelga del listado del módulo.
  const base = useDiagramasBase();

  const { data, cargando, error: errorCarga, noEncontrado, reintentar } = useCargaGated<{ ejercicio: EjercicioDTO }>(
    slug && ejSlug ? `/api/contenidos/${slug}/diagramas/${ejSlug}` : null,
  );
  const ej = data?.ejercicio ?? null;

  // El historial se recarga con `reintentar` tras cada envío: es el mismo gesto
  // —volver a pedir la URL— y ahorra duplicar la carga con estado propio.
  const { data: datosEnvios, reintentar: recargarHistorial } = useCargaGated<{ envios: EnvioLista[] }>(
    slug && ejSlug ? `/api/contenidos/${slug}/diagramas/${ejSlug}/envios` : null,
  );
  const envios = datosEnvios?.envios ?? [];

  const [codigo, setCodigo] = useState('');
  const [ocupado, setOcupado] = useState<'' | 'probar' | 'enviar'>('');
  const [error, setError] = useState('');
  const [informe, setInforme] = useState<{ titulo: string; r: ResultadoDiagrama } | null>(null);

  // Diagramas incrustados en el enunciado. Ref de CALLBACK: el solver se
  // re-renderiza mucho (editor, veredicto, historial) y React puede recrear este
  // contenedor, restaurando el HTML original y borrando el SVG ya dibujado.
  const refEnunciado = useDiagramas([ej?.enunciadoHtml]);

  // Al llegar el ejercicio, el editor arranca con el código semilla del autor.
  useEffect(() => {
    if (!ej) return;
    setCodigo(ej.codigoInicial ?? '');
  }, [ej]);

  // OJO: no pasar `tooltips({ parent: document.body })` para sacar de la columna
  // el desplegable del autocompletado. CodeMirror crea entonces un contenedor
  // `position: relative` al final de <body> y posiciona el desplegable de forma
  // absoluta dentro de él; al abrirse, ese elemento amplía el área desplazable y
  // aparece un hueco vacío al final de la página.
  //
  // Sin extensión de lenguaje: el resaltado de CodeMirror no cubre Mermaid ni
  // PlantUML, y aplicar el de otro lenguaje colorearía mal. Es el mismo criterio
  // que el editor de autoría (`CODIGO_EXT`).
  const extensiones = useMemo(() => [EditorView.lineWrapping], []);

  const post = useCallback(
    async (accion: 'evaluar' | 'enviar', fuente: string): Promise<{ resultado: ResultadoDiagrama }> => {
      const res = await fetch(`/api/contenidos/${slug}/diagramas/${ejSlug}/${accion}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken ?? '' },
        body: JSON.stringify({ codigo: fuente }),
      });
      const json: { message?: string; resultado?: ResultadoDiagrama } = await res.json().catch(() => ({}));
      if (!res.ok || !json.resultado) throw new Error(json.message || 'No se pudo evaluar el diagrama');
      return { resultado: json.resultado };
    },
    [slug, ejSlug, sessionToken],
  );

  /**
   * Evaluar un diagrama es parsear y recorrer un grafo: el veredicto viaja en la
   * respuesta de la propia petición. A diferencia del solver de código, aquí no
   * hay cola de trabajos que sondear ni estado intermedio que mostrar.
   */
  async function ejecutar(accion: 'evaluar' | 'enviar') {
    setOcupado(accion === 'evaluar' ? 'probar' : 'enviar');
    setError('');
    setInforme(null);
    try {
      const { resultado } = await post(accion, codigo);
      setInforme({ titulo: accion === 'evaluar' ? 'Prueba' : 'Envío', r: resultado });
      // Solo el envío queda registrado, así que solo él cambia el historial.
      if (accion === 'enviar') recargarHistorial();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setOcupado('');
    }
  }

  if (cargando) return <div className={styles.page}><p className={styles.info}>Cargando…</p></div>;
  if (errorCarga) {
    return (
      <div className={styles.page}>
        <p className={styles.info}>No se pudo cargar el ejercicio. Puede deberse a un problema de conexión.</p>
        <button className={`${styles.volver} ${styles.enlaceBoton}`} onClick={reintentar}>Reintentar</button>
      </div>
    );
  }
  if (noEncontrado || !ej) {
    return (
      <div className={styles.page}>
        <p className={styles.info}>No se encontró este ejercicio.</p>
        <Link to={base} className={styles.volver}>Volver a diagramas</Link>
      </div>
    );
  }

  const trabajando = ocupado !== '';
  const vacio = !codigo.trim();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to={base} className={styles.volver}>← Diagramas</Link>
        <h1 className={styles.titulo}>
          {ej.titulo}
          {/* Junto al título y no solo en el aviso de abajo: es lo primero que
              se lee al abrir, y es lo que distingue este ejercicio del resto. */}
          {ej.esEjemplo && <span className={styles.distintivoEjemplo}>Ejercicio completo</span>}
        </h1>
        {/* Sin este aviso, un ejercicio que abre ya resuelto parece uno normal
            que alguien dejó hecho, y el alumno no sabe que puede tocarlo. */}
        {ej.esEjemplo && (
          <p className={styles.avisoEjemplo}>
            <strong>Ejemplo resuelto.</strong> El diagrama ya está completo y no hace falta
            modificarlo: sirve para contrastarlo con los que construirás después. Puede enviarse
            tal cual para ver el informe, y también modificarse para observar qué comprobación
            deja de cumplirse. No cuenta para el progreso.
          </p>
        )}
        <div className={styles.metaFila}>
          <span className={styles.meta}>{etiquetaTipoDiagrama(ej.tipoDiagrama)}</span>
          <span className={styles.meta}>{etiquetaMotorDiagrama(ej.motor)}</span>
        </div>
      </header>

      <div className={styles.cols}>
        {/* Enunciado, diagramas dados y comprobaciones anunciadas */}
        <section className={styles.enunciadoCol}>
          <div ref={refEnunciado} className={styles.enunciado} dangerouslySetInnerHTML={{ __html: ej.enunciadoHtml }} />

          {ej.diagramasContexto.length > 0 && (
            <>
              <h2 className={styles.subtitulo}>Diagramas de contexto</h2>
              {/* Dibujados, no como código: son parte del enunciado y su lectura
                  es la premisa del ejercicio, no un ejemplo de notación. */}
              <div className={styles.contextos}>
                {ej.diagramasContexto.map((c) => (
                  <figure key={c.nombre} className={styles.contexto}>
                    <figcaption className={styles.contextoHead}>
                      <span className={styles.contextoTitulo}>{c.titulo || c.nombre}</span>
                      <span className={styles.contextoTipo}>{etiquetaTipoDiagrama(c.tipo)}</span>
                    </figcaption>
                    <VistaPreviaDiagrama codigo={c.codigo} motor={c.motor} altura={200} />
                  </figure>
                ))}
              </div>
            </>
          )}

          {ej.comprobacionesVisibles.length > 0 && (
            <>
              <h2 className={styles.subtitulo}>Comprobaciones</h2>
              <ul className={styles.comprobaciones}>
                {ej.comprobacionesVisibles.map((c) => (
                  <li key={c.indice} className={styles.comprobacion}>{c.comprobacion}</li>
                ))}
              </ul>
            </>
          )}
          {ej.comprobacionesOcultas > 0 && (
            <p className={styles.nota}>
              Al enviar se evalúan también {plural(ej.comprobacionesOcultas, 'comprobación oculta', 'comprobaciones ocultas')}.
            </p>
          )}
        </section>

        {/* Editor con vista previa, acciones, resultado e historial */}
        <section className={styles.editorCol}>
          <div className={styles.split}>
            <div className={styles.panel}>
              <span className={styles.panelLabel}>Diagrama</span>
              <CodeMirror
                value={codigo}
                height="420px"
                theme={oneDark}
                extensions={extensiones}
                onChange={setCodigo}
                editable={!trabajando}
              />
            </div>
            <div className={styles.panel}>
              <span className={styles.panelLabel}>Vista previa</span>
              {/* Repinta con retardo y, si el código no compila, conserva el
                  último dibujo válido y muestra debajo el mensaje del motor. */}
              <VistaPreviaDiagrama codigo={codigo} motor={ej.motor} altura={420} />
            </div>
          </div>

          <div className={styles.acciones}>
            <button
              className={styles.btnSec}
              onClick={() => ejecutar('evaluar')}
              disabled={trabajando || vacio}
              title={vacio ? 'El editor está vacío.' : undefined}
            >
              {ocupado === 'probar' ? 'Evaluando…' : 'Probar'}
            </button>
            <button
              className={styles.btnPri}
              onClick={() => ejecutar('enviar')}
              disabled={trabajando || vacio}
              title={vacio ? 'El editor está vacío.' : undefined}
            >
              {ocupado === 'enviar' ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
          <p className={styles.nota}>«Probar» no queda registrado; «Enviar» sí.</p>

          {error && <div className={styles.errorBox}>{error}</div>}

          {informe && (
            <div className={styles.resultado}>
              <div className={styles.veredictoRow}>
                <span className={`${styles.badge} ${informe.r.veredicto === 'aceptado' ? styles.badgeOk : styles.badgeMal}`}>
                  {VEREDICTO_LABEL[informe.r.veredicto] ?? informe.r.veredicto}
                </span>
                <span className={styles.conteo}>
                  {informe.titulo} · {informe.r.asercionesPasadas}/{informe.r.asercionesTotales} comprobaciones
                </span>
              </div>

              {/* La sintaxis corta la evaluación: sin modelo no hay nada que
                  comprobar, así que en ese caso la lista llega vacía. */}
              {informe.r.errorSintaxis && <pre className={styles.salidaPre}>{informe.r.errorSintaxis}</pre>}

              {informe.r.aserciones.map((a) => (
                <div key={a.indice} className={`${styles.caso} ${a.paso ? styles.casoOk : styles.casoMal}`}>
                  <div className={styles.casoHead}>
                    <span className={styles.casoNombre}>
                      {a.oculta && <span className={styles.etiquetaOculta}>Oculta</span>}
                      {a.comprobacion}
                    </span>
                    <span className={styles.casoEstado}>{a.paso ? '✓' : '✗'}</span>
                  </div>
                  {/* Solo llega en las visibles que fallaron: el servidor no
                      envía el detalle de una comprobación oculta. */}
                  {a.detalle && <p className={styles.casoDetalle}>{a.detalle}</p>}
                </div>
              ))}
            </div>
          )}

          <h2 className={styles.subtitulo}>Envíos</h2>
          {envios.length === 0 ? (
            <p className={styles.info}>Todavía no hay envíos registrados de este ejercicio.</p>
          ) : (
            <ul className={styles.historial}>
              {envios.map((e) => (
                <li key={e.id} className={styles.envio}>
                  <span className={`${styles.badge} ${e.veredicto === 'aceptado' ? styles.badgeOk : styles.badgeMal}`}>
                    {VEREDICTO_LABEL[e.veredicto] ?? e.veredicto}
                  </span>
                  <span className={styles.conteo}>{e.asercionesPasadas}/{e.asercionesTotales}</span>
                  <span className={styles.envioFecha}>{FECHA.format(new Date(e.createdAt))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
