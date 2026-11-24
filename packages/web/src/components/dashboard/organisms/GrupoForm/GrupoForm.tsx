import { useState } from 'react';
import TextInput from '../../atoms/TextInput/TextInput';
import DashButton from '../../atoms/DashButton/DashButton';
import type { CategoriaRef } from '../../atoms/NombreGrupo/NombreGrupo';
import styles from './GrupoForm.module.css';

/** Administrador asignable a un grupo (subconjunto de lo que expone el API). */
export interface AdminRef {
  id: string;
  name: string;
  email: string;
}

interface GrupoData {
  id?: string;
  name: string;
  fechaInicio?: string;
  fechaFin?: string;
  admins?: AdminRef[];
  urlAgendaEntrevistas?: string | null;
  categoria?: CategoriaRef | null;
  /** Campos del perfil que este grupo NO pide. Vacío = los pide todos. */
  camposPerfilDeshabilitados?: string[];
  horarioClase?: HorarioClase;
}

/** Hora de clase por día de la semana (zona del curso). Ver `Grupo.horarioClase`. */
export type HorarioClase = Partial<Record<string, { inicio: string; fin: string }>>;

const DIAS_HORARIO = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
] as const;

/**
 * Campos del perfil del alumno que un grupo puede no pedir. Espeja
 * `CAMPOS_DESACTIVABLES` de la API (`models/campos-perfil.ts`), que es quien
 * manda: si aquí apareciera uno que allí no es desactivable, el guardado da 400.
 *
 * Los que no están en esta lista (experiencia, expectativas, compromiso) se
 * piden siempre: son el compromiso mínimo con el alumno.
 */
const CAMPOS_PERFIL_OPCIONALES = [
  {
    key: 'repositorioIndividual',
    label: 'Repositorio individual',
    ayuda: 'URL de GitHub del alumno. Apágalo en los grupos que no trabajan con repositorio propio.',
  },
] as const;

interface GrupoSavePayload {
  name: string;
  camposPerfilDeshabilitados?: string[];
  /** `null` = quitar la fecha. NO `undefined`: JSON.stringify lo borra del
   *  cuerpo y el servidor no puede distinguirlo de "no toques este campo". */
  fechaInicio?: string | null;
  fechaFin?: string | null;
  admins?: string[];
  urlAgendaEntrevistas?: string;
  /** id de la categoría, o `null` para quitársela. */
  categoriaId?: string | null;
  horarioClase?: HorarioClase;
}

interface GrupoFormProps {
  grupo?: GrupoData;
  /** Administradores dados de alta, para asignarlos al grupo (asociación).
   *  Las COLECCIONES se asignan aparte, en la acción "Asignaciones". */
  admins?: AdminRef[];
  /** Catálogo de categorías para el desplegable. Vacío = solo "Sin categoría". */
  categorias?: CategoriaRef[];
  onSave: (data: GrupoSavePayload) => void;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * Fecha del API → valor de un `<input type="date">` (`YYYY-MM-DD`).
 *
 * Vía `toISOString()`, es decir en UTC, que es donde viven estas fechas: son
 * días de calendario guardados a medianoche UTC. Leerlas en la zona del
 * navegador (`getFullYear()` y compañía) restaría un día en todo México.
 */
function toDateString(value?: string | Date): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

export default function GrupoForm({ grupo, admins = [], categorias = [], onSave, onCancel, loading }: GrupoFormProps) {
  const [name, setName] = useState(grupo?.name ?? '');
  const [fechaInicio, setFechaInicio] = useState(toDateString(grupo?.fechaInicio));
  const [fechaFin, setFechaFin] = useState(toDateString(grupo?.fechaFin));
  const [adminsSel, setAdminsSel] = useState<string[]>(
    (grupo?.admins ?? []).map((a) => a.id),
  );
  const [agendaUrl, setAgendaUrl] = useState(grupo?.urlAgendaEntrevistas ?? '');
  const [categoriaId, setCategoriaId] = useState(grupo?.categoria?.id ?? '');
  // Se guarda al revés de como se pinta: la casilla marcada = campo PEDIDO, y lo
  // que viaja al servidor es la lista de los apagados (ausente = todo pedido).
  const [camposApagados, setCamposApagados] = useState<string[]>(
    grupo?.camposPerfilDeshabilitados ?? [],
  );
  const [error, setError] = useState('');
  const [errorAgenda, setErrorAgenda] = useState('');
  // Un día marcado = hay clase ese día a esa hora. Al desmarcar se conserva la
  // hora escrita por si se vuelve a marcar, pero no viaja al servidor.
  const [horario, setHorario] = useState(() =>
    Object.fromEntries(
      DIAS_HORARIO.map(({ key }) => {
        const f = grupo?.horarioClase?.[key];
        return [key, { activo: !!f, inicio: f?.inicio ?? '17:30', fin: f?.fin ?? '19:30' }];
      }),
    ) as Record<string, { activo: boolean; inicio: string; fin: string }>,
  );
  const [errorHorario, setErrorHorario] = useState('');

  function cambiarHorario(dia: string, cambio: Partial<{ activo: boolean; inicio: string; fin: string }>) {
    setHorario((prev) => ({ ...prev, [dia]: { ...prev[dia], ...cambio } }));
    setErrorHorario('');
  }


  function togglePedido(key: string) {
    setCamposApagados((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function toggleAdmin(id: string) {
    setAdminsSel((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  }

  function doSave() {
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }
    // El servidor vuelve a validar esto (es el que manda); aquí es solo para no
    // hacer un viaje de ida y vuelta por una URL obviamente mal escrita.
    const url = agendaUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      setErrorAgenda('La URL debe empezar por http:// o https://');
      return;
    }
    const horarioClase: HorarioClase = {};
    for (const { key, label } of DIAS_HORARIO) {
      const d = horario[key];
      if (!d.activo) continue;
      if (!d.inicio || !d.fin || d.inicio >= d.fin) {
        setErrorHorario(`${label}: la hora de inicio tiene que ser antes que la de fin`);
        return;
      }
      horarioClase[key] = { inicio: d.inicio, fin: d.fin };
    }
    setError('');
    setErrorAgenda('');
    setErrorHorario('');
    onSave({
      horarioClase,
      name: name.trim(),
      // Campo vacío = null = quitar la fecha (antes iba `undefined`, que se caía
      // del JSON: la fecha se quedaba puesta y no había forma de borrarla).
      fechaInicio: fechaInicio || null,
      fechaFin: fechaFin || null,
      admins: adminsSel,
      camposPerfilDeshabilitados: camposApagados,
      // '' = sin categoría → null, que es lo que el servidor entiende por
      // quitársela. Un `undefined` se caería del JSON y la dejaría puesta.
      categoriaId: categoriaId || null,
      // Cadena vacía = quitar el enlace del grupo.
      urlAgendaEntrevistas: url,
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    doSave();
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <TextInput
        label="Nombre"
        placeholder="Nombre del grupo"
        icon="group"
        value={name}
        onChange={(v) => { setName(v); setError(''); }}
        error={error}
        disabled={loading}
      />
      <div className={styles.field}>
        <label className={styles.label} htmlFor="grupo-categoria">
          Categoría
        </label>
        <div className={styles.categoriaFila}>
          {/* La muestra repite el color del elegido: sin ella hay que abrir el
              desplegable para saber de qué color va a salir el grupo. */}
          <span
            className={styles.categoriaPunto}
            style={{ background: categorias.find((c) => c.id === categoriaId)?.color }}
            aria-hidden="true"
          />
          <select
            id="grupo-categoria"
            className={styles.select}
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            disabled={loading}
          >
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <span className={styles.hint}>
          La materia o el nivel. De ella sale el color con que se distingue el grupo en las listas.
        </span>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Administradores del grupo</label>
        <div className={styles.checkboxList}>
          {admins.length === 0 && (
            <span className={styles.hint}>No hay administradores dados de alta.</span>
          )}
          {admins.map((a) => {
            const label = a.name ? `${a.name} (${a.email})` : a.email;
            return (
              <label key={a.id} className={styles.checkboxItem}>
                <input
                  type="checkbox"
                  checked={adminsSel.includes(a.id)}
                  onChange={() => toggleAdmin(a.id)}
                  disabled={loading}
                />
                <span className={styles.checkboxLabel} title={label}>{label}</span>
              </label>
            );
          })}
        </div>
      </div>
      <TextInput
        label="URL de la agenda de entrevistas (opcional)"
        placeholder="https://docs.google.com/spreadsheets/…"
        icon="event_available"
        value={agendaUrl}
        onChange={(v) => { setAgendaUrl(v); setErrorAgenda(''); }}
        error={errorAgenda}
        disabled={loading}
      />
      <p className={styles.hint}>
        Aparece como “Agendar Entrevistas” en el menú del grupo y en el de sus alumnos.
        Déjala vacía para no mostrar el enlace.
      </p>
      {/* Ambas fechas son opcionales, así que se pueden dejar en blanco. El botón
          "Quitar" existe porque vaciar un <input type="date"> a mano es un engorro
          (hay que borrar día, mes y año por separado) y en algunos navegadores
          directamente no se puede. */}
      <div className={styles.field}>
        <label className={styles.label}>Fecha de inicio</label>
        <div className={styles.dateRow}>
          <input
            type="date"
            className={styles.dateInput}
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            disabled={loading}
          />
          {fechaInicio && (
            <button
              type="button"
              className={styles.clearDate}
              onClick={() => setFechaInicio('')}
              disabled={loading}
            >
              Quitar
            </button>
          )}
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Fecha de fin</label>
        <div className={styles.dateRow}>
          <input
            type="date"
            className={styles.dateInput}
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            disabled={loading}
          />
          {fechaFin && (
            <button
              type="button"
              className={styles.clearDate}
              onClick={() => setFechaFin('')}
              disabled={loading}
            >
              Quitar
            </button>
          )}
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Horario de clase</label>
        <p className={styles.hint}>
          A qué hora es la sesión cada día. Los días con clase salen del calendario del grupo; esto
          solo pone la hora para que las sesiones aparezcan en «Mi agenda» y se vean los traslapes.
        </p>
        <div className={styles.horario}>
          {DIAS_HORARIO.map(({ key, label }) => {
            const d = horario[key];
            return (
              <div key={key} className={styles.horarioFila}>
                <label className={styles.horarioDia}>
                  <input
                    type="checkbox"
                    checked={d.activo}
                    onChange={(e) => cambiarHorario(key, { activo: e.target.checked })}
                    disabled={loading}
                  />
                  {label}
                </label>
                <input
                  type="time"
                  className={styles.horarioHora}
                  value={d.inicio}
                  onChange={(e) => cambiarHorario(key, { inicio: e.target.value })}
                  disabled={loading || !d.activo}
                  aria-label={`${label}: inicio`}
                />
                <span className={styles.hint}>a</span>
                <input
                  type="time"
                  className={styles.horarioHora}
                  value={d.fin}
                  onChange={(e) => cambiarHorario(key, { fin: e.target.value })}
                  disabled={loading || !d.activo}
                  aria-label={`${label}: fin`}
                />
              </div>
            );
          })}
        </div>
        {errorHorario && <span className={styles.errorTexto}>{errorHorario}</span>}
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Perfil que se pide al alumno</label>
        <p className={styles.hint}>
          Experiencia, expectativas y compromiso se piden siempre. Lo que desmarques aquí
          desaparece del formulario del alumno y deja de bloquearle el acceso a Malla,
          Competencias, Wiki y Ejercicios.
        </p>
        <div className={styles.checkboxList}>
          {CAMPOS_PERFIL_OPCIONALES.map((campo) => (
            <label key={campo.key} className={styles.campoItem}>
              <input
                type="checkbox"
                checked={!camposApagados.includes(campo.key)}
                onChange={() => togglePedido(campo.key)}
                disabled={loading}
              />
              <span className={styles.campoTexto}>
                <span className={styles.campoLabel}>{campo.label}</span>
                <span className={styles.campoAyuda}>{campo.ayuda}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className={styles.actions}>
        <DashButton variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </DashButton>
        <DashButton disabled={loading} onClick={doSave}>
          {loading ? 'Guardando...' : grupo ? 'Actualizar' : 'Crear'}
        </DashButton>
      </div>
    </form>
  );
}
