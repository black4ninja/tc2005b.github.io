import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router';
import { confirmar } from '../../../../utils/dialogos';
import { useAuth } from '../../../../context/AuthContext';
import DashButton from '../../atoms/DashButton/DashButton';
import styles from './PlanEvaluacionPage.module.css';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PeriodoConfig {
  nombre: string;
  pesoFinal: number;
  pesoCompetencias: number;
  pesoActividades: number;
  competencias: string[];
  actividades: string[];
  acumulativo: boolean;
}

interface CompetenciaData {
  id: string;
  competencia: string;
  nivel: string;
}

interface ActividadData {
  id: string;
  nombre: string;
  tipo: string;
  aprendizajePlaneado: number;
  semanaPlaneada: number;
  congelada: boolean;
}

const API_BASE = '/api';

const DEFAULT_PERIODO: PeriodoConfig = {
  nombre: '',
  pesoFinal: 0,
  pesoCompetencias: 50,
  pesoActividades: 50,
  competencias: [],
  actividades: [],
  acumulativo: false,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PlanEvaluacionPage() {
  const { id: grupoId } = useParams<{ id: string }>();
  const { sessionToken } = useAuth();

  const [periodos, setPeriodos] = useState<PeriodoConfig[]>([]);
  const [competencias, setCompetencias] = useState<CompetenciaData[]>([]);
  const [actividades, setActividades] = useState<ActividadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState<Record<number, boolean>>({});

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  };

  const authHeaders: Record<string, string> = {
    'x-session-token': sessionToken ?? '',
  };

  /* ---------- Data fetching ---------- */

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [planRes, compRes, actRes] = await Promise.all([
        fetch(`${API_BASE}/admin/grupos/${grupoId}/plan-evaluacion`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin/competencias`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin/grupos/${grupoId}/actividades-evaluacion`, { headers: authHeaders }),
      ]);

      if (!planRes.ok || !compRes.ok || !actRes.ok) {
        throw new Error('Error al cargar datos');
      }

      const [planJson, compJson, actJson] = await Promise.all([
        planRes.json(),
        compRes.json(),
        actRes.json(),
      ]);

      setCompetencias(compJson.competencias ?? []);
      setActividades(actJson.actividades ?? []);

      if (planJson.plan?.periodos) {
        setPeriodos(planJson.plan.periodos);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [grupoId, sessionToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------- Actividades grouped by week ---------- */

  const actividadesBySemana = useMemo(() => {
    const map = new Map<number, ActividadData[]>();
    const sorted = [...actividades].sort((a, b) => a.semanaPlaneada - b.semanaPlaneada);
    for (const act of sorted) {
      const week = act.semanaPlaneada || 0;
      if (!map.has(week)) map.set(week, []);
      map.get(week)!.push(act);
    }
    return map;
  }, [actividades]);

  /* ---------- Exclusive activity assignment ---------- */

  /** Returns IDs of actividades assigned in other periodos (not periodoIdx) */
  function getUsedByOtherPeriodos(periodoIdx: number): Set<string> {
    const used = new Set<string>();
    for (let i = 0; i < periodos.length; i++) {
      if (i === periodoIdx) continue;
      for (const id of periodos[i].actividades) {
        used.add(id);
      }
    }
    return used;
  }

  /** Returns names of other periodos where compId is selected */
  function getCompUsedInOtherPeriodos(compId: string, periodoIdx: number): string[] {
    const names: string[] = [];
    for (let i = 0; i < periodos.length; i++) {
      if (i === periodoIdx) continue;
      if (periodos[i].competencias.includes(compId)) {
        names.push(periodos[i].nombre || `Periodo ${i + 1}`);
      }
    }
    return names;
  }

  /* ---------- Periodo helpers ---------- */

  function updatePeriodo(index: number, patch: Partial<PeriodoConfig>) {
    setPeriodos((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
    setSuccess('');
  }

  function addPeriodo() {
    const num = periodos.length + 1;
    setPeriodos((prev) => [...prev, { ...DEFAULT_PERIODO, nombre: `Periodo ${num}` }]);
    setSuccess('');
  }

  function removePeriodo(index: number) {
    setPeriodos((prev) => prev.filter((_, i) => i !== index));
    setSuccess('');
  }

  function toggleCompetencia(periodoIdx: number, compId: string) {
    setPeriodos((prev) =>
      prev.map((p, i) => {
        if (i !== periodoIdx) return p;
        const has = p.competencias.includes(compId);
        return {
          ...p,
          competencias: has
            ? p.competencias.filter((c) => c !== compId)
            : [...p.competencias, compId],
        };
      }),
    );
    setSuccess('');
  }

  function toggleActividad(periodoIdx: number, actId: string) {
    setPeriodos((prev) =>
      prev.map((p, i) => {
        if (i !== periodoIdx) return p;
        const has = p.actividades.includes(actId);
        return {
          ...p,
          actividades: has
            ? p.actividades.filter((a) => a !== actId)
            : [...p.actividades, actId],
        };
      }),
    );
    setSuccess('');
  }

  function toggleAllWeek(periodoIdx: number, weekActividades: ActividadData[]) {
    setPeriodos((prev) =>
      prev.map((p, i) => {
        if (i !== periodoIdx) return p;
        const ids = weekActividades.map((a) => a.id);
        const allSelected = ids.every((id) => p.actividades.includes(id));
        if (allSelected) {
          return { ...p, actividades: p.actividades.filter((a) => !ids.includes(a)) };
        } else {
          const newIds = ids.filter((id) => !p.actividades.includes(id));
          return { ...p, actividades: [...p.actividades, ...newIds] };
        }
      }),
    );
    setSuccess('');
  }

  /* ---------- Compute totals ---------- */

  function getActividadesTotals(periodo: PeriodoConfig, periodoIdx: number) {
    const ownIds = new Set(periodo.actividades);
    let ownPoints = 0;
    for (const act of actividades) {
      if (ownIds.has(act.id)) ownPoints += act.aprendizajePlaneado;
    }

    let inheritedPoints = 0;
    if (periodo.acumulativo && periodoIdx > 0) {
      for (let pi = 0; pi < periodoIdx; pi++) {
        const prevIds = new Set(periodos[pi].actividades);
        for (const act of actividades) {
          if (prevIds.has(act.id) && !ownIds.has(act.id)) {
            inheritedPoints += act.aprendizajePlaneado;
          }
        }
      }
    }

    return { ownPoints, inheritedPoints, totalPoints: ownPoints + inheritedPoints };
  }

  function getInheritedActividadIds(periodoIdx: number): Set<string> {
    const ids = new Set<string>();
    if (periodoIdx === 0) return ids;
    for (let pi = 0; pi < periodoIdx; pi++) {
      for (const id of periodos[pi].actividades) {
        ids.add(id);
      }
    }
    return ids;
  }

  /* ---------- Derived ---------- */

  const totalPesoFinal = periodos.reduce((sum, p) => sum + p.pesoFinal, 0);

  /* ---------- Save ---------- */

  async function handleSave() {
    setError('');
    setSuccess('');

    if (periodos.length === 0) {
      setError('Agrega al menos un periodo');
      return;
    }

    const totalPeso = periodos.reduce((sum, p) => sum + p.pesoFinal, 0);
    if (totalPeso !== 100) {
      setError(`Los pesos finales deben sumar 100 (actualmente suman ${totalPeso})`);
      return;
    }

    for (const p of periodos) {
      if (p.pesoCompetencias + p.pesoActividades !== 100) {
        setError(`En "${p.nombre}": competencias + actividades deben sumar 100`);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/plan-evaluacion`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ periodos }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Error al guardar');
      }
      setSuccess('Plan de evaluación guardado correctamente');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  /* ---------- Toggle week expand ---------- */

  function toggleWeek(key: string) {
    setExpandedWeeks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  /* ---------- Bulk congelar / descongelar por periodo ---------- */

  async function handleBulkCongelar(periodoIdx: number, congelada: boolean) {
    const periodo = periodos[periodoIdx];
    // SOLO actividades seleccionadas en ESTE periodo (no las heredadas, no las de otros)
    const ids = [...periodo.actividades];
    if (ids.length === 0) {
      setError('Este periodo no tiene actividades seleccionadas');
      return;
    }
    const accion = congelada ? 'congelar' : 'descongelar';
    const nombrePeriodo = periodo.nombre || `Periodo ${periodoIdx + 1}`;
    const ok = await confirmar({
      titulo: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} ${ids.length} actividad(es) seleccionadas en "${nombrePeriodo}"?`,
      texto: congelada
        ? 'Los alumnos NO podrán modificar la "Semana completada" de estas actividades.'
        : 'Los alumnos PODRÁN modificar nuevamente la "Semana completada" de estas actividades.',
      confirmar: accion.charAt(0).toUpperCase() + accion.slice(1),
    });
    if (!ok) return;

    setBulkBusy((prev) => ({ ...prev, [periodoIdx]: true }));
    setError('');
    setSuccess('');
    try {
      const res = await fetch(
        `${API_BASE}/admin/grupos/${grupoId}/actividades-evaluacion/bulk-congelar`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ actividadIds: ids, congelada }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Error al actualizar actividades');
      }
      // Aplicar el cambio solo a las que realmente se actualizaron (excluir skipped)
      const updatedIds: string[] = Array.isArray(json.actividadIds) ? json.actividadIds : ids;
      setActividades((prev) =>
        prev.map((a) => (updatedIds.includes(a.id) ? { ...a, congelada } : a)),
      );
      const skipped: string[] = Array.isArray(json.skippedIds) ? json.skippedIds : [];
      const accionLabel = congelada ? 'congeladas' : 'descongeladas';
      if (skipped.length > 0) {
        // Algunas IDs del plan ya no existen en la BD (huérfanas tras eliminación).
        // No es un error: aplicamos lo que se pudo y avisamos.
        setSuccess(
          `${json.updated} actividad(es) ${accionLabel} en "${nombrePeriodo}". ` +
          `${skipped.length} se omitieron porque ya no existen en este grupo ` +
          `(plan desactualizado — al guardar el plan se limpiarán).`,
        );
      } else {
        setSuccess(
          `${json.updated} actividad(es) ${accionLabel} en "${nombrePeriodo}"`,
        );
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBulkBusy((prev) => ({ ...prev, [periodoIdx]: false }));
    }
  }

  function getCongeladasCount(periodoIdx: number): { total: number; congeladas: number } {
    const ids = new Set(periodos[periodoIdx]?.actividades ?? []);
    let congeladas = 0;
    for (const a of actividades) {
      if (ids.has(a.id) && a.congelada) congeladas++;
    }
    return { total: ids.size, congeladas };
  }

  /* ---------- Render ---------- */

  if (loading) {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>Plan de Evaluación</h1>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Plan de Evaluación</h1>
        <DashButton onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </DashButton>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      {/* Calificación Final overview */}
      {periodos.length > 0 && (
        <div className={styles.finalCard}>
          <div className={styles.finalHeader}>
            <span className="material-icons" style={{ fontSize: '20px' }}>functions</span>
            <h2 className={styles.finalTitle}>Calificación Final</h2>
          </div>
          <div className={styles.finalFormula}>
            <span className={styles.finalFormulaText}>
              Final ={' '}
              {periodos.map((p, i) => (
                <span key={i}>
                  {i > 0 && ' + '}
                  <strong>{p.nombre || `P${i + 1}`}</strong> × {p.pesoFinal}%
                </span>
              ))}
            </span>
          </div>
          <div className={styles.finalWeightsRow}>
            {periodos.map((p, i) => {
              const totals = getActividadesTotals(p, i);
              return (
                <div key={i} className={styles.finalWeightItem}>
                  <span className={styles.finalWeightName}>{p.nombre || `P${i + 1}`}</span>
                  <span className={styles.finalWeightValue}>{p.pesoFinal}%</span>
                  <span className={styles.finalWeightDetail}>
                    Comp. {p.pesoCompetencias}% ({p.competencias.length} sel.)
                    {' · '}
                    Act. {p.pesoActividades}% ({totals.totalPoints} pts)
                  </span>
                </div>
              );
            })}
            <div className={styles.finalWeightTotal}>
              <span className={styles.finalWeightName}>Total</span>
              <span className={totalPesoFinal === 100 ? styles.finalWeightOk : styles.finalWeightError}>
                {totalPesoFinal}%
              </span>
              {totalPesoFinal !== 100 && (
                <span className={styles.finalWeightWarn}>Debe sumar 100%</span>
              )}
            </div>
          </div>
          {periodos.length > 0 && (
            <div className={styles.finalDesglose}>
              {periodos.map((p, i) => (
                <div key={i} className={styles.finalDesgloseItem}>
                  <span className={styles.finalDesgloseName}>{p.nombre || `P${i + 1}`}</span>
                  <span className={styles.finalDesgloseFormula}>
                    = Competencias × {p.pesoCompetencias}% + Actividades × {p.pesoActividades}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {periodos.map((periodo, pi) => {
        const totals = getActividadesTotals(periodo, pi);
        const inheritedIds = periodo.acumulativo ? getInheritedActividadIds(pi) : new Set<string>();
        const usedByOthers = getUsedByOtherPeriodos(pi);

        return (
          <div key={pi} className={styles.periodoCard}>
            <div className={styles.periodoHeader}>
              <h2 className={styles.periodoTitle}>{periodo.nombre || `Periodo ${pi + 1}`}</h2>
              {periodos.length > 1 && (
                <button
                  className={styles.removeBtn}
                  onClick={() => removePeriodo(pi)}
                  title="Eliminar periodo"
                >
                  <span className="material-icons">delete</span>
                </button>
              )}
            </div>

            <div className={styles.periodoBody}>
              {/* Config fields */}
              <div className={styles.fieldRow}>
                <div className={styles.inputGroup}>
                  <span className={styles.inputLabel}>Nombre</span>
                  <input
                    className={styles.input}
                    type="text"
                    value={periodo.nombre}
                    onChange={(e) => updatePeriodo(pi, { nombre: e.target.value })}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <span className={styles.inputLabel}>Peso final (%)</span>
                  <input
                    className={styles.input}
                    type="number"
                    min={0}
                    max={100}
                    value={periodo.pesoFinal}
                    onChange={(e) => updatePeriodo(pi, { pesoFinal: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <span className={styles.inputLabel}>Acumulativo</span>
                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={periodo.acumulativo}
                      onChange={(e) => updatePeriodo(pi, { acumulativo: e.target.checked })}
                    />
                    Incluir actividades anteriores
                  </label>
                </div>
              </div>

              <div className={styles.fieldRowTwo}>
                <div className={styles.inputGroup}>
                  <span className={styles.inputLabel}>Peso competencias (%)</span>
                  <input
                    className={styles.input}
                    type="number"
                    min={0}
                    max={100}
                    value={periodo.pesoCompetencias}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      updatePeriodo(pi, {
                        pesoCompetencias: val,
                        pesoActividades: 100 - val,
                      });
                    }}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <span className={styles.inputLabel}>Peso actividades (%)</span>
                  <input
                    className={styles.input}
                    type="number"
                    min={0}
                    max={100}
                    value={periodo.pesoActividades}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      updatePeriodo(pi, {
                        pesoActividades: val,
                        pesoCompetencias: 100 - val,
                      });
                    }}
                  />
                </div>
              </div>

              <div className={styles.divider} />

              {/* Competencias */}
              <div className={styles.fieldGroup}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>Competencias</span>
                  <span className={styles.badge}>
                    {periodo.competencias.length} seleccionada{periodo.competencias.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className={styles.competenciasList}>
                  {competencias.length === 0 ? (
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      No hay competencias registradas
                    </span>
                  ) : (
                    competencias.map((comp) => {
                      const otherPeriodos = getCompUsedInOtherPeriodos(comp.id, pi);
                      return (
                        <label key={comp.id} className={styles.competenciaItem}>
                          <input
                            type="checkbox"
                            checked={periodo.competencias.includes(comp.id)}
                            onChange={() => toggleCompetencia(pi, comp.id)}
                          />
                          <span>{comp.competencia} — {comp.nivel}</span>
                          {otherPeriodos.length > 0 && (
                            <span className={styles.alsoInTag}>
                              También en {otherPeriodos.join(', ')}
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className={styles.divider} />

              {/* Actividades */}
              <div className={styles.fieldGroup}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>Actividades</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {periodo.acumulativo && totals.inheritedPoints > 0 && (
                      <span className={styles.badge}>
                        Propias: {totals.ownPoints} pts
                      </span>
                    )}
                    <span className={styles.badge}>
                      Total: {totals.totalPoints} pts
                    </span>
                  </div>
                </div>

                <div className={styles.actividadesContainer}>
                  {/* Inherited activities (read-only) */}
                  {periodo.acumulativo && inheritedIds.size > 0 && (
                    <div className={styles.semanaGroup}>
                      <div className={styles.semanaHeader} onClick={() => toggleWeek(`${pi}-inherited`)}>
                        <div className={styles.semanaHeaderLeft}>
                          <span className="material-icons" style={{ fontSize: '16px' }}>
                            {expandedWeeks[`${pi}-inherited`] ? 'expand_more' : 'chevron_right'}
                          </span>
                          Actividades heredadas
                        </div>
                        <span className={styles.semanaPoints}>{totals.inheritedPoints} pts</span>
                      </div>
                      {expandedWeeks[`${pi}-inherited`] && (
                        <div className={styles.semanaBody}>
                          {actividades
                            .filter((a) => inheritedIds.has(a.id) && !periodo.actividades.includes(a.id))
                            .map((act) => (
                              <div key={act.id} className={styles.actividadItem} style={{ opacity: 0.7 }}>
                                <input type="checkbox" checked disabled />
                                <span>{act.nombre}</span>
                                <span className={styles.inheritedTag}>heredada</span>
                                <span className={styles.actividadPoints}>{act.aprendizajePlaneado} pts</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Own activities by week */}
                  {Array.from(actividadesBySemana.entries()).map(([week, weekActs]) => {
                    // Filter out activities assigned to other periodos (exclusive assignment)
                    const availableActs = weekActs.filter(
                      (a) => !usedByOthers.has(a.id) || periodo.actividades.includes(a.id),
                    );
                    // Skip weeks with no available activities
                    if (availableActs.length === 0) return null;

                    const weekKey = `${pi}-${week}`;
                    const expanded = expandedWeeks[weekKey];
                    const weekPoints = availableActs.reduce((s, a) => s + a.aprendizajePlaneado, 0);
                    const allSelected = availableActs.every((a) => periodo.actividades.includes(a.id));

                    return (
                      <div key={weekKey} className={styles.semanaGroup}>
                        <div className={styles.semanaHeader} onClick={() => toggleWeek(weekKey)}>
                          <div className={styles.semanaHeaderLeft}>
                            <span className="material-icons" style={{ fontSize: '16px' }}>
                              {expanded ? 'expand_more' : 'chevron_right'}
                            </span>
                            Semana {week || '?'}
                          </div>
                          <div className={styles.semanaHeaderRight}>
                            <span className={styles.semanaPoints}>{weekPoints} pts</span>
                            <button
                              className={styles.selectAllBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAllWeek(pi, availableActs);
                              }}
                            >
                              {allSelected ? 'Deseleccionar' : 'Seleccionar todas'}
                            </button>
                          </div>
                        </div>
                        {expanded && (
                          <div className={styles.semanaBody}>
                            {availableActs.map((act) => (
                              <label key={act.id} className={styles.actividadItem}>
                                <input
                                  type="checkbox"
                                  checked={periodo.actividades.includes(act.id)}
                                  onChange={() => toggleActividad(pi, act.id)}
                                />
                                <span>{act.nombre}</span>
                                <span className={styles.actividadPoints}>
                                  {act.aprendizajePlaneado} pts
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Bulk congelar / descongelar — opera sobre periodo.actividades únicamente */}
                {(() => {
                  const { total, congeladas } = getCongeladasCount(pi);
                  const busy = !!bulkBusy[pi];
                  const sinSeleccion = total === 0;
                  return (
                    <div
                      className={styles.bulkCongelarBar}
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 12,
                        alignItems: 'center',
                        marginTop: 12,
                        paddingTop: 12,
                        borderTop: '1px solid var(--border-color, #eee)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          color: 'var(--text-secondary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span className="material-icons" style={{ fontSize: 16 }}>lock</span>
                        {sinSeleccion
                          ? 'Sin actividades seleccionadas en este periodo'
                          : `${congeladas} de ${total} actividad(es) seleccionadas están congeladas`}
                      </span>
                      <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                        <DashButton
                          variant="outline"
                          onClick={() => handleBulkCongelar(pi, true)}
                          disabled={sinSeleccion || busy || congeladas === total}
                        >
                          {busy ? 'Aplicando...' : `Congelar las ${total} seleccionadas`}
                        </DashButton>
                        <DashButton
                          variant="outline"
                          onClick={() => handleBulkCongelar(pi, false)}
                          disabled={sinSeleccion || busy || congeladas === 0}
                        >
                          {busy ? 'Aplicando...' : `Descongelar las ${total} seleccionadas`}
                        </DashButton>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })}

      <button className={styles.addPeriodoBtn} onClick={addPeriodo}>
        <span className="material-icons">add</span>
        Agregar periodo
      </button>

    </div>
  );
}
