import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { useAuth } from '../../context/AuthContext';
import { useCargaGated } from '../../hooks/useCargaGated';
import { extensionLenguaje, NOMBRE_LENGUAJE } from '../../config/codemirrorLenguaje';
import styles from './EjercicioSolver.module.css';

interface CasoMuestra { indice: number; entrada: string; salidaEsperada: string }
interface EjercicioDTO {
  id: string;
  titulo: string;
  slug: string;
  enunciadoHtml: string;
  lenguajes: string[];
  codigoInicial: Record<string, string>;
  limiteTiempoMs: number;
  casosMuestra: CasoMuestra[];
  casosOcultos: number;
}
interface ResultadoCaso {
  indice: number; oculto: boolean; paso: boolean; veredicto: string;
  entrada?: string; salidaEsperada?: string; salidaObtenida?: string;
}
interface ResultadoEval {
  veredicto: string; casosPasados: number; casosTotales: number;
  errorCompilacion?: string; casos: ResultadoCaso[]; tiempoMaxMs: number;
}
interface ResultadoSalida { errorCompilacion?: string; salida: string; error: string; agotoTiempo: boolean }

const VEREDICTO_LABEL: Record<string, string> = {
  aceptado: 'Aceptado',
  respuesta_incorrecta: 'Respuesta incorrecta',
  tiempo_excedido: 'Tiempo excedido',
  error_compilacion: 'Error de compilación',
  error_ejecucion: 'Error de ejecución',
  limite_memoria: 'Límite de memoria',
};

export default function EjercicioSolverPage() {
  const { slug, ejSlug } = useParams<{ slug: string; ejSlug: string }>();
  const { sessionToken } = useAuth();

  const { data, cargando, error: errorCarga, noEncontrado, reintentar } = useCargaGated<{ ejercicio: EjercicioDTO }>(
    slug && ejSlug ? `/api/contenidos/${slug}/ejercicios/${ejSlug}` : null,
  );
  const ej = data?.ejercicio ?? null;

  const [lenguaje, setLenguaje] = useState('');
  const [codigoPorLeng, setCodigoPorLeng] = useState<Record<string, string>>({});
  const [entrada, setEntrada] = useState('');
  const [ocupado, setOcupado] = useState<'' | 'muestra' | 'entrada' | 'enviar'>('');
  const [error, setError] = useState('');

  const [evalResult, setEvalResult] = useState<{ titulo: string; r: ResultadoEval } | null>(null);
  const [salidaResult, setSalidaResult] = useState<ResultadoSalida | null>(null);

  // Al llegar el ejercicio: idioma inicial y código semilla por lenguaje.
  useEffect(() => {
    if (!ej) return;
    setLenguaje(ej.lenguajes[0] ?? '');
    const inicial: Record<string, string> = {};
    for (const l of ej.lenguajes) inicial[l] = ej.codigoInicial?.[l] ?? '';
    setCodigoPorLeng(inicial);
  }, [ej]);

  const codigo = codigoPorLeng[lenguaje] ?? '';
  const extensiones = useMemo(() => [extensionLenguaje(lenguaje), EditorView.lineWrapping], [lenguaje]);

  const post = useCallback(async (accion: 'ejecutar' | 'enviar', body: object) => {
    const res = await fetch(`/api/contenidos/${slug}/ejercicios/${ejSlug}/${accion}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken ?? '' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || 'Error al ejecutar');
    return json;
  }, [slug, ejSlug, sessionToken]);

  async function probarMuestra() {
    setOcupado('muestra'); setError(''); setSalidaResult(null);
    try {
      const json = await post('ejecutar', { lenguaje, codigo });
      setEvalResult({ titulo: 'Casos de muestra', r: json.resultado });
    } catch (e: any) { setError(e.message); } finally { setOcupado(''); }
  }

  async function ejecutarEntrada() {
    setOcupado('entrada'); setError(''); setEvalResult(null);
    try {
      const json = await post('ejecutar', { lenguaje, codigo, entrada });
      setSalidaResult(json.resultado);
    } catch (e: any) { setError(e.message); } finally { setOcupado(''); }
  }

  async function enviar() {
    setOcupado('enviar'); setError(''); setSalidaResult(null);
    try {
      const json = await post('enviar', { lenguaje, codigo });
      setEvalResult({ titulo: 'Envío', r: json.resultado });
    } catch (e: any) { setError(e.message); } finally { setOcupado(''); }
  }

  if (cargando) return <div className={styles.page}><p className={styles.info}>Cargando…</p></div>;
  if (errorCarga) {
    return (
      <div className={styles.page}>
        <p className={styles.info}>No se pudo cargar. Revisa tu conexión e inténtalo de nuevo.</p>
        <button
          className={styles.volver}
          style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
          onClick={reintentar}
        >
          Reintentar
        </button>
      </div>
    );
  }
  if (noEncontrado || !ej) {
    return (
      <div className={styles.page}>
        <p className={styles.info}>No se encontró este ejercicio.</p>
        <Link to={`/contenidos/${slug}/ejercicios`} className={styles.volver}>Volver a ejercicios</Link>
      </div>
    );
  }

  const trabajando = ocupado !== '';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to={`/contenidos/${slug}/ejercicios`} className={styles.volver}>← Ejercicios</Link>
        <h1 className={styles.titulo}>{ej.titulo}</h1>
      </header>

      <div className={styles.cols}>
        {/* Enunciado + casos de muestra */}
        <section className={styles.enunciadoCol}>
          <div className={styles.enunciado} dangerouslySetInnerHTML={{ __html: ej.enunciadoHtml }} />
          {ej.casosMuestra.length > 0 && (
            <div className={styles.muestras}>
              <h2 className={styles.subtitulo}>Casos de ejemplo</h2>
              {ej.casosMuestra.map((c) => (
                <div key={c.indice} className={styles.muestra}>
                  <div><span className={styles.muestraLabel}>Entrada</span><pre className={styles.pre}>{c.entrada}</pre></div>
                  <div><span className={styles.muestraLabel}>Salida</span><pre className={styles.pre}>{c.salidaEsperada}</pre></div>
                </div>
              ))}
            </div>
          )}
          {ej.casosOcultos > 0 && (
            <p className={styles.info}>Además hay {ej.casosOcultos} caso(s) oculto(s) al enviar.</p>
          )}
        </section>

        {/* Editor + acciones + resultados */}
        <section className={styles.editorCol}>
          <div className={styles.editorHead}>
            {ej.lenguajes.length > 1 ? (
              <select className={styles.select} value={lenguaje} onChange={(e) => setLenguaje(e.target.value)} disabled={trabajando}>
                {ej.lenguajes.map((l) => <option key={l} value={l}>{NOMBRE_LENGUAJE[l] ?? l}</option>)}
              </select>
            ) : (
              <span className={styles.lengFijo}>{NOMBRE_LENGUAJE[lenguaje] ?? lenguaje}</span>
            )}
          </div>

          <CodeMirror
            value={codigo}
            height="320px"
            theme={oneDark}
            extensions={extensiones}
            onChange={(v) => setCodigoPorLeng((prev) => ({ ...prev, [lenguaje]: v }))}
            editable={!trabajando}
          />

          <div className={styles.entradaBox}>
            <label className={styles.entradaLabel}>Entrada personalizada (opcional)</label>
            <textarea
              className={styles.entradaArea}
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              rows={2}
              placeholder="Escribe una entrada para probar tu código…"
              disabled={trabajando}
            />
          </div>

          <div className={styles.acciones}>
            <button
              className={styles.btnSec}
              onClick={probarMuestra}
              disabled={trabajando || ej.casosMuestra.length === 0}
              title={ej.casosMuestra.length === 0 ? 'Este ejercicio no tiene casos de muestra; usa Enviar.' : undefined}
            >
              {ocupado === 'muestra' ? 'Ejecutando…' : 'Probar casos de muestra'}
            </button>
            <button className={styles.btnSec} onClick={ejecutarEntrada} disabled={trabajando || !entrada.trim()}>
              {ocupado === 'entrada' ? 'Ejecutando…' : 'Ejecutar con mi entrada'}
            </button>
            <button className={styles.btnPri} onClick={enviar} disabled={trabajando}>
              {ocupado === 'enviar' ? 'Enviando…' : 'Enviar'}
            </button>
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}

          {salidaResult && (
            <div className={styles.resultado}>
              {salidaResult.errorCompilacion ? (
                <>
                  <span className={`${styles.badge} ${styles.badgeMal}`}>Error de compilación</span>
                  <pre className={styles.salidaPre}>{salidaResult.errorCompilacion}</pre>
                </>
              ) : (
                <>
                  <span className={styles.resLabel}>Salida{salidaResult.agotoTiempo ? ' (tiempo excedido)' : ''}</span>
                  <pre className={styles.salidaPre}>{salidaResult.salida || '(sin salida)'}</pre>
                  {salidaResult.error && <pre className={styles.stderrPre}>{salidaResult.error}</pre>}
                </>
              )}
            </div>
          )}

          {evalResult && (
            <div className={styles.resultado}>
              <div className={styles.veredictoRow}>
                <span className={`${styles.badge} ${evalResult.r.veredicto === 'aceptado' ? styles.badgeOk : styles.badgeMal}`}>
                  {VEREDICTO_LABEL[evalResult.r.veredicto] ?? evalResult.r.veredicto}
                </span>
                <span className={styles.conteo}>{evalResult.r.casosPasados}/{evalResult.r.casosTotales} casos</span>
              </div>
              {evalResult.r.errorCompilacion && <pre className={styles.salidaPre}>{evalResult.r.errorCompilacion}</pre>}
              {evalResult.r.casos.map((c) => (
                <div key={c.indice} className={`${styles.caso} ${c.paso ? styles.casoOk : styles.casoMal}`}>
                  <div className={styles.casoHead}>
                    <span>{c.oculto ? `Caso oculto ${c.indice + 1}` : `Caso ${c.indice + 1}`}</span>
                    <span>{c.paso ? '✓' : (VEREDICTO_LABEL[c.veredicto] ?? c.veredicto)}</span>
                  </div>
                  {!c.oculto && !c.paso && (
                    <div className={styles.casoDetalle}>
                      <div><span className={styles.muestraLabel}>Entrada</span><pre className={styles.pre}>{c.entrada}</pre></div>
                      <div><span className={styles.muestraLabel}>Esperado</span><pre className={styles.pre}>{c.salidaEsperada}</pre></div>
                      <div><span className={styles.muestraLabel}>Tu salida</span><pre className={styles.pre}>{c.salidaObtenida}</pre></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
