import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import { esPenalizacion } from '@tc2005b/evaluacion';
import Icon from '../../atoms/Icon/Icon';
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
  evidencias: string[];
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

function formatValor(valor: string | number): string {
  if (valor === '' || valor === undefined || valor === null) return '—';
  if (esPenalizacion(valor)) return '−30 pts';
  return String(valor);
}

export default function AlumnoCompetenciasPage() {
  const { id: grupoId } = useParams<{ id: string }>();
  const { sessionToken } = useAuth();
  const [competencias, setCompetencias] = useState<CompetenciaData[]>([]);
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

      {competencias.map((comp) => {
        const activeP1 = getActiveLevel(comp.valorPeriodo1);
        const activeP2 = getActiveLevel(comp.valorPeriodo2);
        // Use latest period for rubric highlight
        const activeLevel = activeP2 ?? activeP1;

        return (
          <details key={comp.id} className={styles.card}>
            <summary className={styles.cardSummary}>
              <Icon name="chevron_right" size="sm" className={styles.chevron} />
              <span className={styles.compName}>{comp.competencia}</span>
              <span className={styles.compNivel}>{comp.nivel}</span>
              <span className={`${styles.tipoBadge} ${comp.esCalculada ? styles.tipoCalculada : styles.tipoDirecta}`}>
                {comp.esCalculada ? 'Calculada' : 'Directa'}
              </span>
              <div className={styles.periodos}>
                <span className={styles.periodoChip}>P1: <strong>{formatValor(comp.valorPeriodo1)}</strong></span>
                <span className={styles.periodoChip}>P2: <strong>{formatValor(comp.valorPeriodo2)}</strong></span>
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
                  <div className={styles.rubricGrid}>
                    {/* La columna de la sanción solo en las competencias que la
                        admiten: en las demás sería una amenaza que no existe. */}
                    {RUBRIC_LEVELS.filter(
                      (n) => n.key !== 'penalizacion' || comp.admitePenalizacion,
                    ).map(({ key, label, percent }) => {
                      const isActive = activeLevel === key;
                      return (
                        <div
                          key={key}
                          className={`${styles.rubricCol} ${isActive ? styles.rubricColActive : ''}`}
                        >
                          <div className={`${styles.rubricHeader} ${isActive ? styles.rubricHeaderActive : ''}`}>
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
              </div>

              <div className={styles.retroGrid}>
                <div className={styles.retroCard}>
                  <div className={styles.retroTitle}>Retroalimentación Periodo 1</div>
                  <p className={comp.retroPeriodo1 ? styles.retroText : styles.noRetro}>
                    {comp.retroPeriodo1 || 'Sin retroalimentación aún.'}
                  </p>
                </div>
                <div className={styles.retroCard}>
                  <div className={styles.retroTitle}>Retroalimentación Periodo 2</div>
                  <p className={comp.retroPeriodo2 ? styles.retroText : styles.noRetro}>
                    {comp.retroPeriodo2 || 'Sin retroalimentación aún.'}
                  </p>
                </div>
              </div>

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
