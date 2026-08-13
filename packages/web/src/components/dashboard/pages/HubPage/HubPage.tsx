import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import TextInput from '../../atoms/TextInput/TextInput';
import DashButton from '../../atoms/DashButton/DashButton';
import Icon from '../../atoms/Icon/Icon';
import {
  materialesDelCalendario,
  filtrarMateriales,
  tiposPresentes,
  etiquetaTipo,
  formatFechaCorta,
  type Material,
} from '../../../../utils/materialesDelCalendario';
import type { Calendario } from '../../../../types/calendario';
import styles from './HubPage.module.css';

const API_BASE = '/api';

/** Nombre del día para la columna. El calendario guarda la clave, no la etiqueta. */
const DIA_LABEL: Record<string, string> = {
  lunes: 'lunes',
  martes: 'martes',
  miercoles: 'miércoles',
  jueves: 'jueves',
  viernes: 'viernes',
};

/**
 * Hub: todo el material del grupo en una lista, con buscador y filtros.
 *
 * El calendario responde «¿qué toca esta semana?». Esta vista responde la
 * pregunta contraria —«¿dónde estaba aquel laboratorio?»—, que con la vista
 * temporal se contesta rebuscando semana por semana.
 *
 * Es SOLO CONSULTA. No se crea, ni se edita, ni se borra: la gobernanza sigue
 * siendo del calendario, y tener dos sitios donde se toca lo mismo acabaría en
 * dos verdades. Por eso tampoco hay endpoint nuevo: se lee el mismo calendario
 * del grupo, con el mismo control de acceso, y la lista se deriva en el cliente.
 */
export default function HubPage() {
  const { id: grupoId } = useParams<{ id: string }>();
  const { pathname } = useLocation();
  // La misma vista vive en dos sitios (`/alumno/...` y `/admin/...`); el enlace
  // al calendario tiene que quedarse en el que corresponda, o el alumno saldría
  // disparado a una pantalla de administración.
  const rutaCalendario = pathname.startsWith('/admin/')
    ? `/admin/grupos/${grupoId}/calendario`
    : `/alumno/grupos/${grupoId}/calendario`;
  const [calendario, setCalendario] = useState<Calendario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [tipos, setTipos] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!grupoId) return;
    let cancelado = false;
    setCargando(true);
    setError('');

    fetch(`${API_BASE}/calendario/${grupoId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('No se pudo cargar el material'))))
      .then((d) => {
        if (cancelado) return;
        setCalendario(d.calendario ?? d);
      })
      .catch((err) => {
        if (!cancelado) setError(err.message);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    // Cambiar de grupo mientras carga el anterior dejaría el material del grupo
    // viejo pintado sobre el nuevo.
    return () => { cancelado = true; };
  }, [grupoId]);

  const materiales = useMemo(() => materialesDelCalendario(calendario), [calendario]);
  const disponibles = useMemo(() => tiposPresentes(materiales), [materiales]);
  const visibles = useMemo(
    () => filtrarMateriales(materiales, busqueda, tipos),
    [materiales, busqueda, tipos],
  );

  function alternarTipo(tipo: string) {
    setTipos((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(tipo)) siguiente.delete(tipo);
      else siguiente.add(tipo);
      return siguiente;
    });
  }

  const hayFiltro = busqueda.trim() !== '' || tipos.size > 0;

  return (
    <div className={styles.page}>
      <h1 className={styles.titulo}>Hub</h1>
      <p className={styles.intro}>
        Todo el material del curso en un solo sitio, en el orden del calendario.
      </p>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.controles}>
        <TextInput
          label=""
          placeholder="Buscar por nombre o descripción"
          icon="search"
          value={busqueda}
          onChange={setBusqueda}
        />
        {hayFiltro && (
          <DashButton variant="outline" onClick={() => { setBusqueda(''); setTipos(new Set()); }}>
            Limpiar
          </DashButton>
        )}
      </div>

      {/* Solo los tipos que existen en ESTE grupo: ofrecer «Evaluación» donde no
          hay ninguna es prometer un filtro que siempre sale vacío. */}
      {disponibles.length > 1 && (
        <div className={styles.filtros}>
          {disponibles.map((tipo) => (
            <button
              key={tipo}
              type="button"
              className={`${styles.chip} ${tipos.has(tipo) ? styles.chipActivo : ''}`}
              aria-pressed={tipos.has(tipo)}
              onClick={() => alternarTipo(tipo)}
            >
              <span className={styles.punto} style={{ background: `var(--color-${tipo})` }} aria-hidden="true" />
              {etiquetaTipo(tipo)}
            </button>
          ))}
        </div>
      )}

      {cargando ? (
        <p className={styles.vacio}>Cargando material…</p>
      ) : visibles.length === 0 ? (
        <p className={styles.vacio}>
          {materiales.length === 0
            ? 'Todavía no hay material con enlace o archivo en el calendario de este grupo.'
            : 'Ningún material coincide con la búsqueda.'}
        </p>
      ) : (
        <>
          <p className={styles.conteo}>
            {visibles.length} de {materiales.length} material{materiales.length === 1 ? '' : 'es'}
          </p>
          <ul className={styles.lista}>
            {visibles.map((m) => (
              <FilaMaterial key={m.id} material={m} rutaCalendario={rutaCalendario} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Extensiones que el API sirve inline; el resto se descarga. Espeja `ActivityItem`. */
function abreEnElNavegador(nombre: string): boolean {
  const n = nombre.toLowerCase();
  return n.endsWith('.html') || n.endsWith('.htm');
}

function FilaMaterial({
  material, rutaCalendario,
}: {
  material: Material;
  rutaCalendario: string;
}) {
  return (
    <li className={styles.fila}>
      {/* Rótulo arriba y número grande debajo: solo, el número no se sabía de
          qué era. Y la fecha exacta, que es lo que de verdad ubica: el
          calendario la guarda por semana, aquí se deduce con el día. */}
      <span className={styles.semana}>
        <span className={styles.semanaRotulo}>Semana</span>
        <span className={styles.semanaNum}>{material.semana}</span>
        <span className={styles.semanaFecha}>
          {DIA_LABEL[material.dia] ?? material.dia}
          {material.fecha && ` ${formatFechaCorta(material.fecha)}`}
        </span>
      </span>

      <span
        className={styles.tipo}
        style={{ background: `var(--color-${material.tipo}-light)`, color: `var(--color-${material.tipo})` }}
      >
        {etiquetaTipo(material.tipo)}
      </span>

      <span className={styles.datos}>
        <span className={styles.nombre}>
          {material.titulo}
          {material.previo && (
            <span className={styles.previo} title="Hay que llevarlo preparado">
              previo a la sesión
            </span>
          )}
        </span>
        {material.descripcion && <span className={styles.descripcion}>{material.descripcion}</span>}
        {material.fechaEntrega && (
          <span className={styles.entrega}>Entrega: {material.fechaEntrega}</span>
        )}
      </span>

      <span className={styles.acciones}>
        {material.enlace && (
          <a
            className={styles.accion}
            href={material.enlace}
            target={material.externo ? '_blank' : undefined}
            rel={material.externo ? 'noopener noreferrer' : undefined}
          >
            <Icon name={material.externo ? 'open_in_new' : 'arrow_forward'} size="sm" />
            Abrir
          </a>
        )}
        {/* El adjunto se sirve por su endpoint, que comprueba pertenencia al
            grupo; nunca se expone la URL del binario. Mismo criterio que en el
            calendario: el HTML se abre, el resto se descarga. */}
        {material.archivoNombre && (
          <a
            className={styles.accion}
            href={`${API_BASE}/calendario/actividad/${material.id}/archivo`}
            target={abreEnElNavegador(material.archivoNombre) ? '_blank' : undefined}
            rel={abreEnElNavegador(material.archivoNombre) ? 'noopener noreferrer' : undefined}
            download={abreEnElNavegador(material.archivoNombre) ? undefined : material.archivoNombre}
            title={material.archivoNombre}
          >
            <Icon name={abreEnElNavegador(material.archivoNombre) ? 'slideshow' : 'download'} size="sm" />
            {material.archivoNombre}
          </a>
        )}
        {/* Devuelve el material a su contexto temporal: abre el calendario en
            SU semana. Es la otra mitad de la idea — esta lista sirve para
            encontrarlo, el calendario para ver cuándo tocaba. */}
        <Link
          className={`${styles.accion} ${styles.accionSecundaria}`}
          to={
            `${rutaCalendario}?semana=${encodeURIComponent(String(material.semana))}` +
            `&actividad=${encodeURIComponent(material.id)}`
          }
          title={`Ver «${material.titulo}» en el calendario, en su semana`}
        >
          <Icon name="calendar_month" size="sm" />
          En el calendario
        </Link>
        {material.enlacesExtra.map((e) => (
          <a
            key={e.url}
            className={styles.accion}
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="open_in_new" size="sm" />
            {e.texto}
          </a>
        ))}
      </span>
    </li>
  );
}
