import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useParams } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import { esPenalizacion, intentoQueCuenta, periodoEvaluado } from '@tc2005b/evaluacion';
import Icon from '../../atoms/Icon/Icon';
import ListaEvidencias from '../../molecules/ListaEvidencias/ListaEvidencias';
import type { Evidencia } from '../../../../types/agenda';
import { HORAS_ANTELACION_EVIDENCIA } from '../../../../utils/agenda';
import styles from './AlumnoCompetenciasPage.module.css';

interface CompetenciaData {
  id: string;
  competencia: string;
  nivel: string;
  descripcionNivel: string;
  orden: number;
  guiaEvidencias: string;
  incipienteB: string;
  incipienteA: string;
  basico: string;
  solido: string;
  destacado: string;
  esCalculada: boolean;
  penalizacion: string;
  admitePenalizacion: boolean;
  valorPeriodo1: string | number;
  valorPeriodo2: string | number;
  retroPeriodo1: string;
  retroPeriodo2: string;
  /** Las URLs sueltas que la malla guarda en la propia competencia. */
  evidencias: string[];
  /** Lo que entregó en sus entrevistas, con la hora de cada cita. */
  entregas?: Evidencia[];
}

const RUBRIC_LEVELS = [
  // La sanción va la PRIMERA, debajo de todo lo demás en severidad: si el alumno
  // llega a verla aquí, es lo que tiene que leer antes que nada.
  { key: 'penalizacion', label: 'Incipiente B', percent: '−30 pts' },
  { key: 'incipienteB', label: 'Incipiente B', percent: '0%' },
  { key: 'incipienteA', label: 'Incipiente A', percent: '15%' },
  { key: 'basico', label: 'Básico', percent: '70%' },
  { key: 'solido', label: 'Sólido', percent: '85%' },
  { key: 'destacado', label: 'Destacado', percent: '100%' },
] as const;

function getActiveLevel(valor: string | number): string | null {
  const num = Number(valor);
  if (isNaN(num) || valor === '') return null;
  // El centinela negativo es la sanción, no una nota bajísima: sin esto caía en
  // el `return 'incipienteB'` del final y el alumno vería resaltado el nivel
  // equivocado.
  if (esPenalizacion(valor)) return 'penalizacion';
  if (num >= 100) return 'destacado';
  if (num >= 85) return 'solido';
  if (num >= 70) return 'basico';
  if (num >= 15) return 'incipienteA';
  return 'incipienteB';
}

/** Cómo se llama el nivel al que cae un valor, para contarlo en una frase. */
function nombreDeNivel(key: string | null): string {
  const nivel = RUBRIC_LEVELS.find((n) => n.key === key);
  return nivel ? `${nivel.label} (${nivel.percent})` : '';
}

function formatValor(valor: string | number): string {
  if (valor === '' || valor === undefined || valor === null) return '—';
  if (esPenalizacion(valor)) return '−30 pts';
  return String(valor);
}

export default function AlumnoCompetenciasPage() {
  const { id: grupoId } = useParams<{ id: string }>();
  const { sessionToken } = useAuth();
  const [competencias, setCompetencias] = useState<CompetenciaData[]>([]);
  // El 1 y el 2 son INTENTOS de entrevista (el 2.º reemplaza al 1.º) y no
  // periodos del curso: lo dice el servidor según el grupo tenga Preguntas.
  const [porIntentos, setPorIntentos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!grupoId || !sessionToken) return;

    fetch(`/api/alumno/grupos/${grupoId}/competencias`, {
      headers: { 'x-session-token': sessionToken },
    })
      // 404 = el grupo no comparte competencias. No es un fallo: es que ahí no
      // existe esa sección, y al cambiar de grupo se puede caer en ella.
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status === 404 ? 'no-disponible' : 'Error')))
      .then((json) => {
        setCompetencias(json.competencias ?? []);
        setPorIntentos(json.porIntentos === true);
      })
      .catch((motivo) =>
        setError(
          motivo === 'no-disponible'
            ? 'Esta sección no está disponible en tu grupo.'
            : 'Error al cargar las competencias.',
        ),
      )
      .finally(() => setLoading(false));
  }, [grupoId, sessionToken]);

  if (loading) return <div className={styles.loading}>Cargando competencias...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!competencias.length) return <div className={styles.empty}>No hay competencias asignadas.</div>;

  return (
    <div className={styles.page}>
      <h2 className={styles.pageTitle}>Competencias</h2>
      {/* La regla, dicha una vez y arriba: con dos números por fila no hay
          forma de deducir cuál de los dos va a la calificación. */}
      {porIntentos && (
        <p className={styles.reglaIntentos}>
          <Icon name="info" size="sm" />
          <span>
            Para tu calificación cuenta tu <strong>2.º intento</strong>, aunque saque menos que el
            primero. Si no lo presentas, cuenta el <strong>1.º</strong>.
          </span>
        </p>
      )}

      {competencias.map((comp) => {
        // Por intentos, un intento sin evaluar es «—» y no el 0 con el que nace la
        // malla: ese 0 también es Incipiente B, y el alumno leería «saqué 0».
        const evaluado1 = !porIntentos || periodoEvaluado(comp.valorPeriodo1, comp.retroPeriodo1);
        const evaluado2 = !porIntentos || periodoEvaluado(comp.valorPeriodo2, comp.retroPeriodo2);
        const cuenta = porIntentos ? intentoQueCuenta(comp) : null;
        const activeP1 = evaluado1 ? getActiveLevel(comp.valorPeriodo1) : null;
        const activeP2 = evaluado2 ? getActiveLevel(comp.valorPeriodo2) : null;
        // En la rúbrica, el tono fuerte es el de la nota que cuenta: el 2.º si
        // lo hay, y si no el 1.º. Fuera de intentos, el 2.º como siempre.
        const fuerte = cuenta === 1 ? activeP1 : activeP2;
        const tenue = cuenta === 1 ? null : activeP1;
        // Las DOS evaluaciones se marcan, no solo la última: lo que el alumno
        // viene a ver es si se movió y hacia dónde, y con una sola resaltada la
        // primera desaparecía y no había de qué comparar.
        const seMantuvo = !!activeP1 && activeP1 === activeP2;
        // La columna de la sanción solo en las competencias que la admiten: en
        // las demás sería una amenaza que no existe.
        const niveles = RUBRIC_LEVELS.filter(
          (n) => n.key !== 'penalizacion' || comp.admitePenalizacion,
        );

        return (
          <details key={comp.id} className={styles.card}>
            <summary className={styles.cardSummary}>
              <Icon name="chevron_right" size="sm" className={styles.chevron} />
              <span className={styles.compName}>{comp.competencia}</span>
              <span className={styles.compNivel}>{comp.nivel}</span>
              <span className={`${styles.tipoBadge} ${comp.esCalculada ? styles.tipoCalculada : styles.tipoDirecta}`}>
                {comp.esCalculada ? 'Calculada' : 'Directa'}
              </span>
              {/* Fichas y no un renglón de texto: es el dato que se compara de
                  un vistazo entre competencias, y con la etiqueta delante del
                  valor —«P1: 85»— lo que se leía primero era la etiqueta. */}
              {/* Por intentos, el chip que cuenta se resalta con la palabra y el
                  otro se apaga sin desaparecer: el alumno sigue viendo de dónde
                  viene, pero no tiene que deducir cuál vale. */}
              <div className={styles.periodos}>
                {([1, 2] as const).map((n) => {
                  const valor = n === 1 ? comp.valorPeriodo1 : comp.valorPeriodo2;
                  const evaluado = n === 1 ? evaluado1 : evaluado2;
                  const esLaQueCuenta = cuenta === n;
                  const apagado = cuenta !== null && !esLaQueCuenta;
                  return (
                    <span
                      key={n}
                      className={[
                        styles.periodoChip,
                        esLaQueCuenta ? styles.periodoChipCuenta : '',
                        apagado ? styles.periodoChipApagado : '',
                      ].filter(Boolean).join(' ')}
                      title={porIntentos
                        ? `${n}.º intento${esLaQueCuenta ? ': es el que cuenta para tu calificación' : evaluado ? '' : ': todavía sin evaluar'}`
                        : n === 1 ? 'Primera evaluación' : 'Segunda evaluación'}
                    >
                      <span className={styles.periodoNum}>
                        {n}{esLaQueCuenta && <span className={styles.cuentaEtiqueta}> · cuenta</span>}
                      </span>
                      <strong className={styles.periodoValor}>{evaluado ? formatValor(valor) : '—'}</strong>
                    </span>
                  );
                })}
              </div>
            </summary>

            <div className={styles.cardBody}>
              {comp.descripcionNivel && (
                <div className={styles.infoSection}>
                  <span className={styles.infoLabel}>Descripción del nivel</span>
                  <p className={styles.infoText}>{comp.descripcionNivel}</p>
                </div>
              )}

              {comp.guiaEvidencias && (
                <div className={styles.infoSection}>
                  <span className={styles.infoLabel}>Guía de evidencias</span>
                  <p className={styles.infoText}>{comp.guiaEvidencias}</p>
                </div>
              )}

              <div className={styles.infoSection}>
                <span className={styles.infoLabel}>Rúbrica de niveles</span>
                <div className={styles.rubricWrap}>
                  {/* Cuántas columnas son se lo dice la fila, no el CSS: son
                      cinco o seis según la competencia admita la sanción, y con
                      el número escrito a mano la sexta se caía a una segunda
                      fila y «Destacado» quedaba solo debajo, altísimo. */}
                  <div
                    className={styles.rubricGrid}
                    style={{ '--columnas': niveles.length } as CSSProperties}
                  >
                    {niveles.map(({ key, label, percent }) => {
                      const esP1 = activeP1 === key;
                      const esP2 = activeP2 === key;
                      // La que cuenta manda en el color; la otra se marca en un
                      // tono más claro, de dónde viene.
                      const esFuerte = fuerte === key;
                      const esTenue = !esFuerte && (tenue === key || esP1 || esP2);
                      const clase = esFuerte ? styles.rubricColActive
                        : esTenue ? styles.rubricColPrevia : '';
                      const claseCabecera = esFuerte ? styles.rubricHeaderActive
                        : esTenue ? styles.rubricHeaderPrevia : '';
                      // La marca va con el estilo de SU cabecera: sobre la
                      // fuerte, el par de contraste; sobre la tenue, la clara.
                      const marca = esFuerte ? styles.marcaActual : styles.marcaPrevia;
                      return (
                        <div
                          key={key}
                          className={`${styles.rubricCol} ${clase}`}
                        >
                          <div className={`${styles.rubricHeader} ${claseCabecera}`}>
                            {/* El renglón de las marcas va SIEMPRE, aunque esté
                                vacío: pintarlo solo en las columnas marcadas
                                las hacía más altas que las demás y las
                                cabeceras quedaban a distinto nivel. */}
                            <span className={styles.rubricMarcas}>
                              {esP1 && <span className={marca}>1</span>}
                              {esP2 && <span className={marca}>2</span>}
                            </span>
                            {label}
                            <span className={styles.rubricPercent}>{percent}</span>
                          </div>
                          <div className={styles.rubricBody}>
                            {comp[key] || '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Dicho con palabras además de con color: el salto entre dos
                    columnas se ve, pero «se mantuvo» no se ve en ninguna parte
                    —es la ausencia de un segundo color— y es justo lo que hay
                    que poder afirmar sin interpretar. */}
                {(activeP1 || activeP2) && (
                  <p className={styles.cambioNivel}>
                    {seMantuvo
                      ? `Se mantuvo en ${nombreDeNivel(activeP1)}: la segunda evaluación no lo movió.`
                      : activeP1 && activeP2
                        ? `De ${nombreDeNivel(activeP1)} en la primera evaluación a ${nombreDeNivel(activeP2)} en la segunda.`
                        : activeP1
                          ? `${nombreDeNivel(activeP1)} en la primera evaluación. La segunda todavía no está.`
                          : `${nombreDeNivel(activeP2)} en la segunda evaluación.`}
                    {cuenta && ` Para tu calificación cuenta el ${cuenta}.º intento.`}
                  </p>
                )}
              </div>

              <div className={styles.retroGrid}>
                <div className={styles.retroCard}>
                  <div className={styles.retroTitle}>Retroalimentación 1</div>
                  <p className={comp.retroPeriodo1 ? styles.retroText : styles.noRetro}>
                    {comp.retroPeriodo1 || 'Sin retroalimentación aún.'}
                  </p>
                </div>
                <div className={styles.retroCard}>
                  <div className={styles.retroTitle}>Retroalimentación 2</div>
                  <p className={comp.retroPeriodo2 ? styles.retroText : styles.noRetro}>
                    {comp.retroPeriodo2 || 'Sin retroalimentación aún.'}
                  </p>
                </div>
              </div>

              {/* Lo que entregó para sus entrevistas, con la hora a la que lo
                  subió y si llegó tarde. Es la misma lista y el mismo criterio
                  que ve el profesor en la agenda: si a él le sale «tarde», al
                  alumno también, y en el sitio donde lee su retroalimentación.
                  Cada una se juzga contra la hora de SU cita, que por eso viaja
                  en la evidencia: una competencia tiene hasta dos. */}
              {(comp.entregas?.length ?? 0) > 0 && (
                <div className={styles.infoSection}>
                  <span className={styles.infoLabel}>Lo que entregaste</span>
                  <ListaEvidencias evidencias={comp.entregas!} conCompetencia={false} />
                  <p className={styles.evidenciasPie}>
                    Se piden con {HORAS_ANTELACION_EVIDENCIA} horas de antelación sobre la hora de
                    tu entrevista.
                  </p>
                </div>
              )}

              {comp.evidencias && comp.evidencias.length > 0 && (
                <div className={styles.infoSection}>
                  <span className={styles.infoLabel}>Evidencias</span>
                  <ul className={styles.evidenciasList}>
                    {comp.evidencias.map((url, i) => (
                      <li key={i}>
                        <a href={url} target="_blank" rel="noopener noreferrer" className={styles.evidenciaLink}>
                          <Icon name="link" size="sm" />
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
