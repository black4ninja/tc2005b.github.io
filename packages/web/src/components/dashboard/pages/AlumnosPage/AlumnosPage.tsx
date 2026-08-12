import { useState, useEffect, useCallback } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useAuth } from '../../../../context/AuthContext';
import AdminTable from '../../organisms/AdminTable/AdminTable';
import DashButton from '../../atoms/DashButton/DashButton';
import TextInput from '../../atoms/TextInput/TextInput';
import AccesoWikiModal from '../../organisms/AccesoWikiModal/AccesoWikiModal';
import type { ActionItem } from '../../organisms/AdminTable/AdminTable';
import styles from './AlumnosPage.module.css';

export interface AlumnoPadron {
  id: string;
  name: string;
  email: string;
  matricula: string;
  /** Cuántas colecciones tiene abiertas por permiso individual. */
  accesosWiki: number;
}

const API_BASE = '/api';
/** Igual que el servidor: por debajo de esto no se busca. */
const BUSCAR_MIN = 2;

/**
 * Padrón completo de alumnos del sistema.
 *
 * Es el único listado que NO cuelga de un grupo —los demás muestran los de una
 * clase—, y existe para lo que no cabe en el modelo de grupos: abrirle a un
 * alumno concreto una wiki que su grupo no le da.
 *
 * La búsqueda y la paginación se resuelven en el SERVIDOR: el padrón crece cada
 * semestre y traerlo entero para filtrar en el navegador dejaría de funcionar
 * en algún momento sin avisar.
 */
export default function AlumnosPage() {
  const { sessionToken } = useAuth();
  const [alumnos, setAlumnos] = useState<AlumnoPadron[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [porPagina, setPorPagina] = useState(50);
  const [busqueda, setBusqueda] = useState('');
  // Texto ya aplicado. Va aparte del que se teclea para no consultar por letra.
  const [consulta, setConsulta] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alumnoAbierto, setAlumnoAbierto] = useState<AlumnoPadron | null>(null);

  const fetchAlumnos = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ pagina: String(pagina) });
      if (consulta) params.set('q', consulta);
      const res = await fetch(`${API_BASE}/admin/alumnos?${params}`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Error al cargar los alumnos');
      setAlumnos(data.alumnos ?? []);
      setTotal(data.total ?? 0);
      setPorPagina(data.porPagina ?? 50);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionToken, pagina, consulta]);

  useEffect(() => {
    fetchAlumnos();
  }, [fetchAlumnos]);

  // Buscar SIEMPRE devuelve a la primera página: quedarse en la 4 tras filtrar
  // enseña una tabla vacía que parece "no hay resultados".
  function buscar() {
    const texto = busqueda.trim();
    if (texto !== '' && texto.length < BUSCAR_MIN) {
      setError(`La búsqueda necesita al menos ${BUSCAR_MIN} caracteres`);
      return;
    }
    setPagina(0);
    setConsulta(texto);
  }

  function limpiarBusqueda() {
    setBusqueda('');
    setPagina(0);
    setConsulta('');
  }

  const columnHelper = createColumnHelper<AlumnoPadron>();

  const columns = [
    columnHelper.accessor('name', { header: 'Alumno' }),
    columnHelper.accessor('matricula', {
      header: 'Matrícula',
      cell: (info) => info.getValue() || '—',
    }),
    columnHelper.accessor('email', { header: 'Correo' }),
    columnHelper.accessor('accesosWiki', {
      header: 'Wikis individuales',
      cell: (info) => {
        const n = info.getValue();
        if (!n) return <span className={styles.sinAcceso}>—</span>;
        return (
          <span className={styles.chipAcceso}>
            {n} {n === 1 ? 'colección' : 'colecciones'}
          </span>
        );
      },
    }),
  ];

  const getActions = (alumno: AlumnoPadron): ActionItem[] => [
    { label: 'Accesos al wiki', icon: 'menu_book', onClick: () => setAlumnoAbierto(alumno) },
  ];

  const paginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Alumnos</h1>

      <p className={styles.intro}>
        Todos los alumnos del sistema, de cualquier grupo. Desde aquí se le puede abrir a uno en
        concreto una wiki que su grupo no le da; el resto de módulos siguen colgando del grupo.
      </p>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.buscador}>
        <TextInput
          label=""
          placeholder="Matrícula, nombre o correo"
          icon="search"
          value={busqueda}
          onChange={setBusqueda}
          onKeyDown={(e) => e.key === 'Enter' && buscar()}
        />
        <DashButton onClick={buscar}>Buscar</DashButton>
        {consulta && (
          <DashButton variant="outline" onClick={limpiarBusqueda}>
            Limpiar
          </DashButton>
        )}
      </div>

      {consulta && (
        <p className={styles.resultado}>
          {total} resultado{total === 1 ? '' : 's'} para “{consulta}”
        </p>
      )}

      <AdminTable
        title="Padrón de alumnos"
        columns={columns}
        data={alumnos}
        loading={loading}
        actions={getActions}
        etiquetaDeFila={(a) => a.name}
        // La búsqueda y el orden los resuelve el servidor sobre el padrón
        // ENTERO; el buscador propio de la tabla solo filtraría la página que
        // está a la vista y daría "sin resultados" con el alumno en la 3.
        searchable={false}
        pagination={false}
        emptyMessage={consulta ? 'Ningún alumno coincide con la búsqueda' : 'No hay alumnos registrados'}
        tableId="alumnos-padron"
      />

      {paginas > 1 && (
        <div className={styles.paginacion}>
          <DashButton variant="outline" onClick={() => setPagina((p) => p - 1)} disabled={pagina === 0}>
            Anterior
          </DashButton>
          <span className={styles.paginaActual}>
            Página {pagina + 1} de {paginas}
          </span>
          <DashButton
            variant="outline"
            onClick={() => setPagina((p) => p + 1)}
            disabled={pagina >= paginas - 1}
          >
            Siguiente
          </DashButton>
        </div>
      )}

      <AccesoWikiModal
        alumno={alumnoAbierto}
        sessionToken={sessionToken ?? ''}
        onClose={() => setAlumnoAbierto(null)}
        onGuardado={fetchAlumnos}
      />
    </div>
  );
}
