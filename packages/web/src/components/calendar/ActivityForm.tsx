import { useState, useEffect, useRef } from 'react';
import type { ActividadTipo } from '@/types/calendario';
import type { PaginaResumen } from '@/types/pagina';
import DashButton from '@/components/dashboard/atoms/DashButton/DashButton';
import styles from './ActivityForm.module.css';

interface DocumentoResumen {
  nombre: string;
  extension: string;
  ruta: string;
}

const API_BASE = '/api';

const TIPO_OPTIONS: { value: ActividadTipo; label: string }[] = [
  { value: 'lab', label: 'Laboratorio' },
  { value: 'lectura', label: 'Lectura' },
  { value: 'ejercicio', label: 'Ejercicio' },
  { value: 'proyecto', label: 'Proyecto' },
  { value: 'evaluacion', label: 'Evaluación' },
  { value: 'trabajo', label: 'Trabajo en clase' },
  { value: 'discusion', label: 'Discusión / Resolución de dudas' },
  { value: 'info', label: 'Información / Caso de estudio' },
  { value: 'break', label: 'Descanso' },
  { value: 'asueto', label: 'Asueto' },
];

export interface ActivityFormData {
  tipo: ActividadTipo;
  titulo?: string;
  descripcion?: string;
  enlace?: string;
  externo?: boolean;
  duracion?: string;
  fechaEntrega?: string;
}

interface ActivityFormProps {
  onSave: (data: ActivityFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  initialData?: Partial<ActivityFormData>;
  mode?: 'create' | 'edit';
}

export default function ActivityForm({ onSave, onCancel, loading, initialData, mode = 'create' }: ActivityFormProps) {
  const [tipo, setTipo] = useState<ActividadTipo>(initialData?.tipo ?? 'lab');
  const [titulo, setTitulo] = useState(initialData?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(initialData?.descripcion ?? '');
  const [enlace, setEnlace] = useState(initialData?.enlace ?? '');
  const [externo, setExterno] = useState(initialData?.externo ?? false);
  const [duracion, setDuracion] = useState(initialData?.duracion ?? '');
  const [fechaEntrega, setFechaEntrega] = useState(initialData?.fechaEntrega ?? '');

  // Page picker state
  const [paginas, setPaginas] = useState<PaginaResumen[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerFilter, setPickerFilter] = useState('');
  const [paginasLoaded, setPaginasLoaded] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Document picker state
  const [documentos, setDocumentos] = useState<DocumentoResumen[]>([]);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [docFilter, setDocFilter] = useState('');
  const [docsLoaded, setDocsLoaded] = useState(false);
  const docPickerRef = useRef<HTMLDivElement>(null);

  // Close pickers on outside click
  useEffect(() => {
    if (!showPicker && !showDocPicker) return;
    function handleClick(e: MouseEvent) {
      if (showPicker && pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
      if (showDocPicker && docPickerRef.current && !docPickerRef.current.contains(e.target as Node)) {
        setShowDocPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPicker, showDocPicker]);

  async function loadPaginas() {
    setShowDocPicker(false);
    if (paginasLoaded) {
      setShowPicker(true);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/paginas`);
      if (res.ok) {
        const data = await res.json();
        setPaginas(data.paginas ?? []);
        setPaginasLoaded(true);
      }
    } catch {
      // silently fail
    }
    setShowPicker(true);
  }

  async function loadDocumentos() {
    setShowPicker(false);
    if (docsLoaded) {
      setShowDocPicker(true);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/documentos`);
      if (res.ok) {
        const data = await res.json();
        setDocumentos(data.documentos ?? []);
        setDocsLoaded(true);
      }
    } catch {
      // silently fail
    }
    setShowDocPicker(true);
  }

  function selectPagina(p: PaginaResumen) {
    setEnlace(`/paginas/${p.slug}`);
    setExterno(false);
    setShowPicker(false);
    setPickerFilter('');
  }

  function selectDocumento(d: DocumentoResumen) {
    setEnlace(d.ruta);
    setExterno(false);
    setShowDocPicker(false);
    setDocFilter('');
  }

  // Find matching page name for the current enlace
  const matchedPagina = enlace.startsWith('/paginas/')
    ? paginas.find((p) => `/paginas/${p.slug}` === enlace)
    : undefined;

  // Find matching document for the current enlace
  const matchedDocumento = enlace.startsWith('/documentos/')
    ? documentos.find((d) => d.ruta === enlace)
    : undefined;

  const filteredPaginas = pickerFilter
    ? paginas.filter((p) =>
        p.titulo.toLowerCase().includes(pickerFilter.toLowerCase()) ||
        p.slug.toLowerCase().includes(pickerFilter.toLowerCase())
      )
    : paginas;

  const filteredDocs = docFilter
    ? documentos.filter((d) =>
        d.nombre.toLowerCase().includes(docFilter.toLowerCase())
      )
    : documentos;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: ActivityFormData = { tipo };

    if (mode === 'edit') {
      // En modo edición, enviar todos los campos para permitir limpiarlos
      data.titulo = titulo.trim();
      data.descripcion = descripcion.trim();
      data.enlace = enlace.trim();
      data.externo = enlace.trim() ? externo : false;
      data.duracion = duracion.trim();
      data.fechaEntrega = fechaEntrega.trim();
    } else {
      // En modo creación, solo enviar campos con contenido
      if (titulo.trim()) data.titulo = titulo.trim();
      if (descripcion.trim()) data.descripcion = descripcion.trim();
      if (enlace.trim()) {
        data.enlace = enlace.trim();
        data.externo = externo;
      }
      if (duracion.trim()) data.duracion = duracion.trim();
      if (fechaEntrega.trim()) data.fechaEntrega = fechaEntrega.trim();
    }

    onSave(data);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label>Tipo de actividad *</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value as ActividadTipo)}>
          {TIPO_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label>Título</label>
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título de la actividad"
        />
      </div>

      <div className={styles.field}>
        <label>Descripción</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Descripción (opcional)"
        />
      </div>

      <div className={styles.field}>
        <label>Enlace</label>
        <div className={styles.enlaceWrapper} ref={pickerRef}>
          <div className={styles.enlaceInputRow}>
            <input
              type="text"
              value={enlace}
              onChange={(e) => setEnlace(e.target.value)}
              placeholder="URL o ruta interna (/labs/lab1)"
              className={styles.enlaceInput}
            />
            <button
              type="button"
              className={styles.pickerBtn}
              onClick={loadPaginas}
              title="Seleccionar página"
            >
              <span className="material-icons">article</span>
            </button>
            <button
              type="button"
              className={styles.pickerBtn}
              onClick={loadDocumentos}
              title="Seleccionar documento"
            >
              <span className="material-icons">description</span>
            </button>
          </div>
          {matchedPagina && (
            <span className={styles.paginaBadge}>
              <span className="material-icons">article</span>
              {matchedPagina.titulo}
            </span>
          )}
          {matchedDocumento && (
            <span className={styles.documentoBadge}>
              <span className="material-icons">description</span>
              {matchedDocumento.nombre}
            </span>
          )}
          {showPicker && (
            <div className={styles.pickerDropdown}>
              <input
                type="text"
                className={styles.pickerSearch}
                value={pickerFilter}
                onChange={(e) => setPickerFilter(e.target.value)}
                placeholder="Buscar página..."
                autoFocus
              />
              {filteredPaginas.length === 0 ? (
                <div className={styles.pickerEmpty}>
                  {paginas.length === 0 ? 'No hay páginas publicadas' : 'Sin resultados'}
                </div>
              ) : (
                <ul className={styles.pickerList}>
                  {filteredPaginas.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={styles.pickerItem}
                        onClick={() => selectPagina(p)}
                      >
                        <span className="material-icons">article</span>
                        <span className={styles.pickerItemText}>
                          <strong>{p.titulo}</strong>
                          <code>/paginas/{p.slug}</code>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {showDocPicker && (
            <div className={styles.pickerDropdown} ref={docPickerRef}>
              <input
                type="text"
                className={styles.pickerSearch}
                value={docFilter}
                onChange={(e) => setDocFilter(e.target.value)}
                placeholder="Buscar documento..."
                autoFocus
              />
              {filteredDocs.length === 0 ? (
                <div className={styles.pickerEmpty}>
                  {documentos.length === 0 ? 'No hay documentos' : 'Sin resultados'}
                </div>
              ) : (
                <ul className={styles.pickerList}>
                  {filteredDocs.map((d) => (
                    <li key={d.nombre}>
                      <button
                        type="button"
                        className={styles.pickerItem}
                        onClick={() => selectDocumento(d)}
                      >
                        <span className="material-icons">description</span>
                        <span className={styles.pickerItemText}>
                          <strong>{d.nombre}</strong>
                          <code>{d.ruta}</code>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {enlace.trim() && (
        <div className={`${styles.field} ${styles.checkboxField}`}>
          <input
            type="checkbox"
            id="externo-check"
            checked={externo}
            onChange={(e) => setExterno(e.target.checked)}
          />
          <label htmlFor="externo-check">Enlace externo (abre en nueva pestaña)</label>
        </div>
      )}

      <div className={styles.field}>
        <label>Duración</label>
        <input
          type="text"
          value={duracion}
          onChange={(e) => setDuracion(e.target.value)}
          placeholder="ej. 30 min, 1h 50min"
        />
      </div>

      <div className={styles.field}>
        <label>Fecha de entrega</label>
        <input
          type="text"
          value={fechaEntrega}
          onChange={(e) => setFechaEntrega(e.target.value)}
          placeholder="ej. Viernes 27 de marzo"
        />
      </div>

      <div className={styles.actions}>
        <DashButton variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </DashButton>
        <DashButton variant="primary" type="submit" disabled={loading}>
          {loading ? 'Guardando...' : (mode === 'edit' ? 'Guardar cambios' : 'Crear actividad')}
        </DashButton>
      </div>
    </form>
  );
}
