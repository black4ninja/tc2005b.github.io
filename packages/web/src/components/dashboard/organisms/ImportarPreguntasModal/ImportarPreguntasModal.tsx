import { useMemo, useRef, useState } from 'react';
import Modal from '../../atoms/Modal/Modal';
import Icon from '../../atoms/Icon/Icon';
import DashButton from '../../atoms/DashButton/DashButton';
import { avisar } from '../../../../utils/dialogos';
import {
  trocearBitacora,
  normalizarEnunciado,
  type CompetenciaConocida,
  type FilaImportada,
} from '../../../../utils/importarPreguntas';
import styles from './ImportarPreguntasModal.module.css';

export interface PreguntaAImportar {
  texto: string;
  competenciaId: string | null;
}

interface Props {
  /** Las del catálogo de esta materia, con la clave delante como en la BD. */
  competencias: CompetenciaConocida[];
  /** Los enunciados que el banco ya tiene, sin normalizar. */
  preguntasExistentes: string[];
  /** Guarda las elegidas. Devuelve lo que el servidor dice que hizo. */
  onImportar: (preguntas: PreguntaAImportar[]) => Promise<{ creadas: number; saltadas: number }>;
  onCerrar: () => void;
}

/** Estado de cada fila, y cómo se cuenta y se rotula. */
const ROTULO: Record<FilaImportada['estado'], string> = {
  nueva: 'nueva',
  repetida: 'repetida en el archivo',
  'en-banco': 'ya en el banco',
};

/**
 * Importar el cuaderno de entrevistas al banco de preguntas.
 *
 * El cuaderno no es un banco: es lo que el profesor fue escribiendo entrevista a
 * entrevista, con el nombre del alumno delante, la misma pregunta repetida para
 * varios, y a veces sus notas sobre la respuesta debajo. Ver `importarPreguntas`
 * para el troceado.
 *
 * Por eso esto NO es una carga a ciegas: enseña TODO lo que ha entendido del
 * archivo, con el estado de cada fila, y solo guarda lo que quede marcado. El
 * troceado acierta casi siempre; «casi» es la razón de que haya que mirarlo
 * antes, porque lo que entra al banco se le acaba proyectando a un alumno.
 *
 * Lo que ya está —en el banco o repetido en el propio archivo— se puede marcar,
 * pero no se marca solo: reimportar el mismo cuaderno en enero no debe duplicar
 * nada por descuido.
 */
export default function ImportarPreguntasModal({
  competencias, preguntasExistentes, onImportar, onCerrar,
}: Props) {
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [filas, setFilas] = useState<FilaImportada[] | null>(null);
  const [huerfanas, setHuerfanas] = useState(0);
  const [elegidas, setElegidas] = useState<Set<number>>(new Set());
  const [competenciaPorFila, setCompetenciaPorFila] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const yaEnBanco = useMemo(
    () => new Set(preguntasExistentes.map(normalizarEnunciado).filter(Boolean)),
    [preguntasExistentes],
  );

  async function leer(archivo: File) {
    setError('');
    if (!/\.txt$/i.test(archivo.name)) {
      setError('Por ahora solo se leen archivos .txt. Si lo tienes en Word, guárdalo como texto.');
      return;
    }
    try {
      const contenido = await archivo.text();
      const { filas: leidas, huerfanas: sueltas } = trocearBitacora(contenido, competencias, yaEnBanco);
      setNombreArchivo(archivo.name);
      setFilas(leidas);
      setHuerfanas(sueltas);
      // Solo lo nuevo viene marcado. Lo demás se puede marcar a mano, pero
      // reimportar el mismo cuaderno no debe duplicar nada sin querer.
      setElegidas(new Set(leidas.flatMap((f, i) => (f.estado === 'nueva' ? [i] : []))));
      setCompetenciaPorFila({});
    } catch {
      setError('No se pudo leer el archivo.');
    }
  }

  const cuentas = useMemo(() => {
    const c = { nueva: 0, repetida: 0, 'en-banco': 0, conflictos: 0, notas: 0 };
    for (const f of filas ?? []) {
      c[f.estado] += 1;
      if (f.conflictoDeClave) c.conflictos += 1;
      c.notas += f.notasApartadas.length;
    }
    return c;
  }, [filas]);

  function alternar(i: number) {
    setElegidas((prev) => {
      const s = new Set(prev);
      if (s.has(i)) s.delete(i); else s.add(i);
      return s;
    });
  }

  async function importar() {
    if (!filas || elegidas.size === 0) return;
    setGuardando(true);
    setError('');
    try {
      const resultado = await onImportar([...elegidas].sort((a, b) => a - b).map((i) => ({
        texto: filas[i].texto,
        competenciaId: competenciaPorFila[i] ?? filas[i].competenciaId,
      })));
      onCerrar();
      // El servidor vuelve a comprobar los duplicados contra el banco de ESE
      // instante, así que puede haber saltado alguna que aquí se veía nueva
      // —otro pudo darla de alta mientras esto estaba abierto—. Se dice en vez
      // de callarlo: si no, la cuenta no cuadraría y parecería un fallo.
      await avisar({
        titulo: resultado.creadas === 1
          ? 'Se importó 1 pregunta'
          : `Se importaron ${resultado.creadas} preguntas`,
        texto: resultado.saltadas > 0
          ? `${resultado.saltadas} se saltaron porque el banco ya las tenía.`
          : undefined,
        icono: 'success',
      });
    } catch (e: unknown) {
      setError(e instanceof Error && e.message ? e.message : 'No se pudieron importar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal isOpen onClose={onCerrar} title="Importar preguntas de un cuaderno de entrevistas" wide>
      <div className={styles.caja}>
        {error && <div className={styles.error}>{error}</div>}

        {!filas ? (
          <>
            <div
              className={`${styles.zona} ${arrastrando ? styles.zonaActiva : ''}`}
              onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={(e) => {
                e.preventDefault();
                setArrastrando(false);
                const archivo = e.dataTransfer.files?.[0];
                if (archivo) leer(archivo);
              }}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
            >
              <Icon name="upload_file" />
              <p className={styles.zonaTexto}>
                Suelta aquí el <strong>.txt</strong> del cuaderno, o pulsa para elegirlo
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".txt,text/plain"
                className={styles.oculto}
                onChange={(e) => { const a = e.target.files?.[0]; if (a) leer(a); }}
              />
            </div>
            <p className={styles.ayuda}>
              Se espera una entrada por entrevista: una línea con el alumno y la competencia,
              y debajo la pregunta.
              {' '}<strong>El nombre del alumno no se importa.</strong> Nada se guarda hasta que
              revises lo que sale y pulses importar.
            </p>
          </>
        ) : (
          <>
            <div className={styles.resumen}>
              <span className={styles.archivo}><Icon name="description" size="sm" /> {nombreArchivo}</span>
              <span className={`${styles.pastilla} ${styles.nueva}`}>{cuentas.nueva} nuevas</span>
              <span className={styles.pastilla}>{cuentas['en-banco']} ya en el banco</span>
              <span className={styles.pastilla}>{cuentas.repetida} repetidas</span>
              {cuentas.conflictos > 0 && (
                <span className={`${styles.pastilla} ${styles.aviso}`}>
                  <Icon name="warning" size="sm" /> {cuentas.conflictos} con la clave cambiada
                </span>
              )}
              <button className={styles.enlaceBtn} onClick={() => { setFilas(null); setNombreArchivo(''); }}>
                elegir otro
              </button>
            </div>

            {(cuentas.notas > 0 || huerfanas > 0) && (
              <p className={styles.ayuda}>
                {cuentas.notas > 0 && (
                  <>Se apartaron <strong>{cuentas.notas}</strong> párrafos que parecen tus notas sobre
                  la respuesta y no preguntas. </>
                )}
                {huerfanas > 0 && (
                  <>Hay <strong>{huerfanas}</strong> líneas sueltas que no caían bajo ninguna entrada.</>
                )}
              </p>
            )}

            <div className={styles.tablaCaja}>
              <table className={styles.tabla}>
                <thead>
                  <tr>
                    <th className={styles.colCheck} />
                    <th>Pregunta</th>
                    <th className={styles.colComp}>Competencia</th>
                    <th className={styles.colEstado}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f, i) => {
                    const marcada = elegidas.has(i);
                    return (
                      <tr key={`${f.linea}-${i}`} className={marcada ? '' : styles.filaApagada}>
                        <td className={styles.colCheck}>
                          <input
                            type="checkbox"
                            checked={marcada}
                            onChange={() => alternar(i)}
                            aria-label={`Importar la pregunta de la línea ${f.linea}`}
                          />
                        </td>
                        <td>
                          <span className={styles.texto}>{f.texto}</span>
                          {f.notasApartadas.length > 0 && (
                            <details className={styles.notas}>
                              <summary>
                                {f.notasApartadas.length === 1
                                  ? '1 párrafo apartado'
                                  : `${f.notasApartadas.length} párrafos apartados`}
                              </summary>
                              {f.notasApartadas.map((n, j) => <p key={j}>{n}</p>)}
                            </details>
                          )}
                        </td>
                        <td className={styles.colComp}>
                          <select
                            className={styles.selector}
                            value={competenciaPorFila[i] ?? f.competenciaId ?? ''}
                            onChange={(e) => setCompetenciaPorFila((p) => ({ ...p, [i]: e.target.value }))}
                          >
                            <option value="">Sin competencia</option>
                            {competencias.map((c) => (
                              <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                          </select>
                          {f.conflictoDeClave && (
                            <span className={styles.conflicto} title={`El archivo decía (${f.claveEnArchivo}), que es de otra competencia. Manda el nombre escrito.`}>
                              <Icon name="warning" size="sm" /> decía ({f.claveEnArchivo})
                            </span>
                          )}
                        </td>
                        <td className={styles.colEstado}>
                          <span className={`${styles.estado} ${f.estado === 'nueva' ? styles.nueva : ''}`}>
                            {ROTULO[f.estado]}
                          </span>
                          <span className={styles.linea}>L{f.linea}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.pie}>
              <span className={styles.seleccion}>
                {elegidas.size === 0
                  ? 'Nada marcado'
                  : `${elegidas.size} de ${filas.length} marcadas`}
              </span>
              <DashButton variant="outline" onClick={onCerrar} disabled={guardando}>
                Cancelar
              </DashButton>
              <DashButton
                variant="primary"
                onClick={importar}
                disabled={guardando || elegidas.size === 0}
              >
                {guardando ? 'Importando…' : `Importar ${elegidas.size}`}
              </DashButton>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
