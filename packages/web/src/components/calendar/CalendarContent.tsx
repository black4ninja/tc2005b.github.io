import { useState, useCallback, useEffect, useLayoutEffect } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { calendarioGrupo2 } from '@/data/calendario';
import type { Calendario, SemanaNormal, SemanaEspecial, Semana, Actividad } from '@/types/calendario';
import { useCalendarFilter } from '@/hooks/useCalendarFilter';
import { useWeekNavigation } from '@/hooks/useWeekNavigation';
import { useCalendarReorder } from '@/hooks/useCalendarReorder';
import { useCreateActividad } from '@/hooks/useCreateActividad';
import { useUpdateActividad } from '@/hooks/useUpdateActividad';
import { useDeleteActividad } from '@/hooks/useDeleteActividad';
import { useCreateSemana } from '@/hooks/useCreateSemana';
import { useReorderSemanas } from '@/hooks/useReorderSemanas';
import { useDeleteSemana } from '@/hooks/useDeleteSemana';
import type { ReorderUpdate } from '@/hooks/useCalendarReorder';
import type { ActivityFormData } from './ActivityForm';
import type { WeekFormData } from './WeekForm';
import FilterBar from './FilterBar';
import WeekNav from './WeekNav';
import WeekCard from './WeekCard';
import CalendarSkeleton from './CalendarSkeleton';
import Modal from '@/components/dashboard/atoms/Modal/Modal';
import ActivityForm from './ActivityForm';
import WeekForm from './WeekForm';
import SortableWeekItem from './SortableWeekItem';
import DashButton from '@/components/dashboard/atoms/DashButton/DashButton';
import { useAuth } from '@/context/AuthContext';
import styles from './CalendarContent.module.css';

const API_BASE = '/api';

const CALENDARIO_MAP: Record<string, Calendario> = {
  '501': calendarioGrupo2,
};

interface CalendarContentProps {
  grupoId?: string;
  stickyTop?: string;
  editable?: boolean;
}

export default function CalendarContent({ grupoId, stickyTop = 'var(--navbar-height)', editable }: CalendarContentProps) {
  const grupoKey = grupoId ?? '501';
  const { sessionToken } = useAuth();

  const [apiCalendario, setApiCalendario] = useState<Calendario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Copy calendar state
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [grupos, setGrupos] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSourceGrupo, setSelectedSourceGrupo] = useState('');
  const [isCopying, setIsCopying] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/calendario/${grupoKey}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setApiCalendario(data.calendario);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('Error fetching calendario from API, using static fallback:', err.message);
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [grupoKey]);

  const refetchCalendario = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/calendario/${grupoKey}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setApiCalendario(data.calendario);
    } catch (err: any) {
      console.warn('Error refetching calendario:', err.message);
    }
  }, [grupoKey]);

  async function openCopyModal() {
    setCopyError(null);
    setSelectedSourceGrupo('');
    setShowCopyModal(true);
    try {
      const res = await fetch(`${API_BASE}/admin/grupos`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (res.ok) {
        const data = await res.json();
        const otherGrupos = (data.grupos ?? [])
          .filter((g: any) => g.id !== calendario?.grupoId)
          .map((g: any) => ({ id: g.id, name: g.name }));
        setGrupos(otherGrupos);
      }
    } catch {
      // silently fail
    }
  }

  async function handleCopyCalendario() {
    if (!selectedSourceGrupo || !calendario?.grupoId) return;
    setIsCopying(true);
    setCopyError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/calendario/copy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken ?? '',
        },
        body: JSON.stringify({
          sourceGrupoId: selectedSourceGrupo,
          targetGrupoId: calendario.grupoId,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Error al copiar');
      setShowCopyModal(false);
      await refetchCalendario();
    } catch (err: any) {
      setCopyError(err.message);
    } finally {
      setIsCopying(false);
    }
  }

  const calendario = apiCalendario ?? CALENDARIO_MAP[grupoKey];
  const semanas = calendario?.semanas ?? [];
  const currentWeekIndex = useWeekNavigation(semanas);
  const { activeFilters, toggleFilter } = useCalendarFilter();

  // Reorder actividades hook
  const { isSaving, saveError, reorder } = useCalendarReorder(setApiCalendario);

  // Create actividad hook + modal state
  const { isCreating, createError, createActividad } = useCreateActividad();
  const [addModalState, setAddModalState] = useState<{
    semanaId: string;
    dayKey: string;
    isPrevio: boolean;
  } | null>(null);

  // Update actividad hook + edit modal state
  const { isUpdating, updateError, updateActividad } = useUpdateActividad();
  const { isDeleting: isDeletingAct, deleteError: deleteActError, deleteActividad } = useDeleteActividad();
  const [editModalState, setEditModalState] = useState<{
    semanaId: string;
    actividadId: string;
    initialData: ActivityFormData;
  } | null>(null);

  // Create semana hook + modal state
  const { isCreating: isCreatingSemana, createError: createSemanaError, createSemana } = useCreateSemana();
  const [showWeekModal, setShowWeekModal] = useState(false);

  // Reorder semanas hook
  const {
    isSaving: isSavingSemanas,
    saveError: saveSemanaError,
    reorderSemanas,
  } = useReorderSemanas(setApiCalendario);

  // Delete semana hook
  const { isDeleting: isDeletingSemana, deleteError: deleteSemanaError, deleteSemana } = useDeleteSemana();

  const weekSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
  );

  const handleAddActivity = useCallback((semanaId: string, dayKey: string, isPrevio: boolean) => {
    setAddModalState({ semanaId, dayKey, isPrevio });
  }, []);

  const handleDeleteWeek = useCallback(async (semanaId: string) => {
    const ok = await deleteSemana(semanaId);
    if (!ok) return;

    setApiCalendario((prev) => {
      if (!prev) return prev;
      const filtered = prev.semanas.filter((s) => s.id !== semanaId);
      let normalCounter = 1;
      const renumbered = filtered.map((s) => {
        if (s.tipo === 'normal') {
          return { ...s, numero: normalCounter++ };
        }
        return { ...s };
      });
      return { ...prev, semanas: renumbered };
    });
  }, [deleteSemana]);

  const handleEditActivity = useCallback((semanaId: string, actividadId: string) => {
    if (!apiCalendario) return;
    const sem = apiCalendario.semanas.find((s) => s.id === semanaId);
    if (!sem || sem.tipo !== 'normal') return;
    const normal = sem as SemanaNormal;

    for (const dayKey of ['lunes', 'martes', 'miercoles', 'jueves'] as const) {
      const day = normal.dias[dayKey];
      if (!day) continue;
      for (const section of ['previo', 'actividades'] as const) {
        const arr = day[section] ?? [];
        const act = arr.find((a) => a.id === actividadId);
        if (act) {
          setEditModalState({
            semanaId,
            actividadId,
            initialData: {
              tipo: act.tipo,
              titulo: act.titulo,
              descripcion: act.descripcion,
              enlace: act.enlace,
              externo: act.externo,
              duracion: act.duracion,
              fechaEntrega: act.fechaEntrega,
            },
          });
          return;
        }
      }
    }
  }, [apiCalendario]);

  const handleSaveEdit = useCallback(async (formData: ActivityFormData) => {
    if (!editModalState) return;
    const updated = await updateActividad(editModalState.actividadId, formData);
    if (!updated) return;

    setApiCalendario((prev) => {
      if (!prev) return prev;
      const next = { ...prev, semanas: [...prev.semanas] };
      const semIdx = next.semanas.findIndex((s) => s.id === editModalState.semanaId);
      if (semIdx === -1) return prev;
      const sem = { ...next.semanas[semIdx] } as SemanaNormal;
      const dias = { ...sem.dias };

      for (const dayKey of ['lunes', 'martes', 'miercoles', 'jueves'] as const) {
        const day = dias[dayKey];
        if (!day) continue;
        for (const section of ['previo', 'actividades'] as const) {
          const arr = day[section];
          if (!arr) continue;
          const idx = arr.findIndex((a) => a.id === editModalState.actividadId);
          if (idx !== -1) {
            const newArr = [...arr];
            newArr[idx] = { ...newArr[idx], ...updated };
            dias[dayKey] = { ...day, [section]: newArr };
            sem.dias = dias;
            next.semanas[semIdx] = sem;
            return next;
          }
        }
      }
      return prev;
    });
    setEditModalState(null);
  }, [editModalState, updateActividad]);

  const handleDeleteActivity = useCallback(async (semanaId: string, actividadId: string) => {
    if (!window.confirm('¿Eliminar esta actividad?')) return;
    const ok = await deleteActividad(actividadId);
    if (!ok) return;

    setApiCalendario((prev) => {
      if (!prev) return prev;
      const next = { ...prev, semanas: [...prev.semanas] };
      const semIdx = next.semanas.findIndex((s) => s.id === semanaId);
      if (semIdx === -1) return prev;
      const sem = { ...next.semanas[semIdx] } as SemanaNormal;
      const dias = { ...sem.dias };

      for (const dayKey of ['lunes', 'martes', 'miercoles', 'jueves'] as const) {
        const day = dias[dayKey];
        if (!day) continue;
        for (const section of ['previo', 'actividades'] as const) {
          const arr = day[section];
          if (!arr) continue;
          const idx = arr.findIndex((a) => a.id === actividadId);
          if (idx !== -1) {
            dias[dayKey] = { ...day, [section]: arr.filter((a) => a.id !== actividadId) };
            sem.dias = dias;
            next.semanas[semIdx] = sem;
            return next;
          }
        }
      }
      return prev;
    });
  }, [deleteActividad]);

  const handleSaveActivity = useCallback(async (formData: ActivityFormData) => {
    if (!addModalState) return;
    const payload = { ...formData, semanaId: addModalState.semanaId, dia: addModalState.dayKey, isPrevio: addModalState.isPrevio };
    const newAct = await createActividad(payload);
    if (!newAct) return;

    setApiCalendario((prev) => {
      if (!prev) return prev;
      const next = { ...prev, semanas: [...prev.semanas] };
      const semIdx = next.semanas.findIndex((s) => s.id === addModalState.semanaId);
      if (semIdx === -1) return prev;
      const sem = { ...next.semanas[semIdx] } as SemanaNormal;
      const dias = { ...sem.dias };
      const dayKey = addModalState.dayKey as keyof typeof dias;
      const day = { ...(dias[dayKey] ?? {}) };
      const key = addModalState.isPrevio ? 'previo' : 'actividades';
      day[key] = [...(day[key] ?? []), newAct as Actividad];
      dias[dayKey] = day;
      sem.dias = dias;
      next.semanas[semIdx] = sem;
      return next;
    });
    setAddModalState(null);
  }, [addModalState, createActividad]);

  const handleReorder = useCallback(
    (weekIndex: number, updates: ReorderUpdate[], newSemana: SemanaNormal) => {
      if (!apiCalendario) return;
      const newCalendario = { ...apiCalendario, semanas: [...apiCalendario.semanas] };
      newCalendario.semanas[weekIndex] = newSemana;
      reorder(updates, newCalendario);
    },
    [apiCalendario, reorder],
  );

  const handleSaveWeek = useCallback(async (formData: WeekFormData) => {
    if (!calendario?.grupoId) return;
    const result = await createSemana({ ...formData, grupoId: calendario.grupoId });
    if (!result) return;

    // Build the new semana for local state
    let newSemana: Semana;
    const rawNumero = result.numero;
    const numero = /^\d+$/.test(rawNumero) ? parseInt(rawNumero, 10) : rawNumero;

    if (formData.tipo === 'especial') {
      newSemana = {
        id: result.id,
        numero,
        fechaInicio: result.fechaInicio,
        fechaFin: result.fechaFin,
        tipo: 'especial',
        titulo: result.titulo ?? '',
        mensaje: result.mensaje ?? '',
        mensajeImportante: result.mensajeImportante,
      } as SemanaEspecial;
    } else {
      newSemana = {
        id: result.id,
        numero: numero as number,
        fechaInicio: result.fechaInicio,
        fechaFin: result.fechaFin,
        tipo: 'normal',
        dias: {},
      } as SemanaNormal;
    }

    setApiCalendario((prev) => {
      if (!prev) return prev;
      return { ...prev, semanas: [...prev.semanas, newSemana] };
    });
    setShowWeekModal(false);
  }, [calendario?.grupoId, createSemana]);

  const handleWeekDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !apiCalendario?.grupoId) return;
    if (active.id === over.id) return;

    const oldIndex = semanas.findIndex((s) => s.id === active.id);
    const newIndex = semanas.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Build reordered semanas
    const reordered = [...semanas];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // Renumber normal weeks
    let normalCounter = 1;
    const renumbered = reordered.map((s) => {
      if (s.tipo === 'normal') {
        return { ...s, numero: normalCounter++ };
      }
      return { ...s };
    });

    const orderedIds = renumbered.map((s) => s.id!).filter(Boolean);
    const optimistic = { ...apiCalendario, semanas: renumbered };
    reorderSemanas(apiCalendario.grupoId, orderedIds, optimistic);
  }, [apiCalendario, semanas, reorderSemanas]);

  const [expandedMap, setExpandedMap] = useState<Record<number, boolean>>(() => {
    try {
      const saved = sessionStorage.getItem('cal-expanded');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });
  const [allExpanded, setAllExpanded] = useState(false);
  const [activeNavIndex, setActiveNavIndex] = useState(currentWeekIndex);

  useEffect(() => {
    try {
      sessionStorage.setItem('cal-expanded', JSON.stringify(expandedMap));
    } catch {}
  }, [expandedMap]);

  useEffect(() => {
    return () => {
      sessionStorage.setItem('cal-scroll', String(window.scrollY));
    };
  }, []);

  useLayoutEffect(() => {
    const saved = sessionStorage.getItem('cal-scroll');
    if (saved) {
      window.scrollTo(0, parseInt(saved, 10));
    }
  }, []);

  useEffect(() => {
    if (currentWeekIndex >= 0) {
      setExpandedMap((prev) => {
        const hasAnySaved = Object.keys(prev).length > 0;
        if (hasAnySaved) return prev;
        return { ...prev, [currentWeekIndex]: true };
      });
      setActiveNavIndex(currentWeekIndex);
    }
  }, [currentWeekIndex]);

  const toggleWeek = useCallback((index: number) => {
    setExpandedMap((prev) => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const toggleExpandAll = useCallback(() => {
    setAllExpanded((prev) => {
      const next = !prev;
      const map: Record<number, boolean> = {};
      for (let i = 0; i < semanas.length; i++) {
        map[i] = next;
      }
      setExpandedMap(map);
      return next;
    });
  }, [semanas.length]);

  const handleSelectWeek = useCallback((index: number) => {
    setActiveNavIndex(index);
    setExpandedMap((prev) => ({ ...prev, [index]: true }));
    const el = document.getElementById(`semana-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  if (loading) {
    return <CalendarSkeleton />;
  }

  if (!calendario) {
    return (
      <div className={styles.calendarContent}>
        <p>Grupo no encontrado.</p>
      </div>
    );
  }

  const anyError = saveError || createError || updateError || deleteActError || createSemanaError || saveSemanaError || deleteSemanaError;
  const anySaving = isSaving || isUpdating || isDeletingAct || isSavingSemanas || isDeletingSemana;

  const semanaIds = semanas.map((s) => s.id ?? '').filter(Boolean);

  const renderWeekCards = () => {
    const cards = semanas.map((semana, index) => {
      const weekCard = (dragHandleProps?: any) => (
        <WeekCard
          key={semana.id ?? index}
          semana={semana}
          index={index}
          expanded={!!expandedMap[index]}
          onToggle={() => toggleWeek(index)}
          isCurrentWeek={index === currentWeekIndex}
          activeFilters={activeFilters}
          editable={editable}
          onReorder={editable ? handleReorder : undefined}
          onAddActivity={editable ? handleAddActivity : undefined}
          onEditActivity={editable ? handleEditActivity : undefined}
          onDeleteActivity={editable ? handleDeleteActivity : undefined}
          onDeleteWeek={editable ? handleDeleteWeek : undefined}
          dragHandleProps={dragHandleProps}
        />
      );

      if (editable && semana.id) {
        return (
          <SortableWeekItem key={semana.id} id={semana.id}>
            {(dragHandleProps) => weekCard(dragHandleProps)}
          </SortableWeekItem>
        );
      }

      return weekCard();
    });

    return cards;
  };

  return (
    <>
      <div className={styles.stickyControls} style={{ top: stickyTop }}>
        <div className={styles.disclaimer}>
          <i className="material-icons">info</i>
          Este calendario es tentativo y está sujeto a cambios.
        </div>
        {editable && (
          <div className={styles.copyRow}>
            <DashButton variant="outline" onClick={openCopyModal}>
              <span className="material-icons" style={{ fontSize: 18 }}>content_copy</span>
              Copiar de otro grupo
            </DashButton>
          </div>
        )}
        {editable && (anySaving || anyError) && (
          <div className={styles.saveStatus}>
            {anySaving && <span className={styles.savingText}>Guardando...</span>}
            {anyError && <span className={styles.saveError}>{anyError}</span>}
          </div>
        )}
        <FilterBar
          activeFilters={activeFilters}
          onToggleFilter={toggleFilter}
          allExpanded={allExpanded}
          onToggleExpandAll={toggleExpandAll}
        />
        <WeekNav
          semanas={semanas}
          activeIndex={activeNavIndex}
          currentWeekIndex={currentWeekIndex}
          onSelectWeek={handleSelectWeek}
        />
      </div>

      <main className={styles.calendarContent}>
        {editable && semanaIds.length > 0 ? (
          <DndContext
            sensors={weekSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleWeekDragEnd}
          >
            <SortableContext items={semanaIds} strategy={verticalListSortingStrategy}>
              {renderWeekCards()}
            </SortableContext>
          </DndContext>
        ) : (
          renderWeekCards()
        )}

        {editable && (
          <button className={styles.addWeekBtn} onClick={() => setShowWeekModal(true)}>
            <i className="material-icons">add_circle_outline</i>
            Agregar semana
          </button>
        )}
      </main>

      {addModalState && (
        <Modal isOpen onClose={() => setAddModalState(null)} title="Agregar actividad">
          <ActivityForm
            onSave={handleSaveActivity}
            onCancel={() => setAddModalState(null)}
            loading={isCreating}
          />
        </Modal>
      )}

      {editModalState && (
        <Modal isOpen onClose={() => setEditModalState(null)} title="Editar actividad">
          <ActivityForm
            onSave={handleSaveEdit}
            onCancel={() => setEditModalState(null)}
            loading={isUpdating}
            initialData={editModalState.initialData}
            mode="edit"
          />
        </Modal>
      )}

      {showWeekModal && (
        <Modal isOpen onClose={() => setShowWeekModal(false)} title="Agregar semana">
          <WeekForm
            onSave={handleSaveWeek}
            onCancel={() => setShowWeekModal(false)}
            loading={isCreatingSemana}
          />
        </Modal>
      )}

      {showCopyModal && (
        <Modal isOpen onClose={() => setShowCopyModal(false)} title="Copiar calendario de otro grupo">
          <div className={styles.copyModal}>
            <p className={styles.copyWarning}>
              <i className="material-icons">warning</i>
              Esto reemplazará todo el calendario actual con el del grupo seleccionado. Esta acción no se puede deshacer.
            </p>
            <div className={styles.copyField}>
              <label>Grupo origen</label>
              <select
                value={selectedSourceGrupo}
                onChange={(e) => setSelectedSourceGrupo(e.target.value)}
              >
                <option value="">— Seleccionar grupo —</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            {copyError && <p className={styles.copyError}>{copyError}</p>}
            <div className={styles.copyActions}>
              <DashButton variant="outline" onClick={() => setShowCopyModal(false)} disabled={isCopying}>
                Cancelar
              </DashButton>
              <DashButton
                variant="primary"
                onClick={handleCopyCalendario}
                disabled={!selectedSourceGrupo || isCopying}
              >
                {isCopying ? 'Copiando...' : 'Copiar calendario'}
              </DashButton>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
