import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { useAuth } from '../../../../context/AuthContext';
import TextInput from '../../atoms/TextInput/TextInput';
import DashButton from '../../atoms/DashButton/DashButton';
import Icon from '../../atoms/Icon/Icon';
import VistaPreviaDiagrama from './VistaPreviaDiagrama';
import { TIPOS_JUZGABLES, etiquetaMotorDiagrama, etiquetaTipoDiagrama, motoresJuezDeTipo } from '../../../../lib/diagramas/etiquetas';
import type {
  AsercionDiagrama,
  DiagramaContextoData,
  EjercicioDiagramaData,
  FamiliaAsercion,
  InformeVerificacionDiagrama,
  MetadatoAsercion,
  MotorDiagrama,
  ParametroAsercion,
  TipoDiagrama,
} from '../../../../types/contenidos';
import styles from './EditorEjercicioDiagramaPage.module.css';

const API_BASE = '/api';

const CODIGO_EXT = [EditorView.lineWrapping];
const ENUNCIADO_EXT = [markdown(), EditorView.lineWrapping];

const FAMILIAS: { key: FamiliaAsercion; label: string }[] = [
  { key: 'lexica', label: 'Léxicas (nombres y presencia)' },
  { key: 'semantica', label: 'Semánticas (estructura del modelo)' },
  { key: 'cruzada', label: 'Cruzadas (coherencia entre diagramas)' },
];

const VEREDICTOS: Record<string, string> = {
  aceptado: 'Aceptado',
  error_sintaxis: 'Error de sintaxis',
  aserciones_fallidas: 'Aserciones fallidas',
};

/** Mensaje legible de un error atrapado, sin recurrir a `any`. */
function mensajeDeError(e: unknown, porDefecto: string): string {
  return e instanceof Error && e.message ? e.message : porDefecto;
}

/**
 * Identidad local de las filas editables.
 *
 * Las aserciones y los diagramas se pueden reordenar y borrar por el medio, y su
 * contenido vive en editores con estado propio (CodeMirror). Con el índice como
 * `key` de React, borrar la fila 1 hacía que el editor de la 2 conservara el
 * texto de la 1: hay que darles una identidad que no dependa de la posición.
 */
let secuenciaUid = 0;
const nuevoUid = () => `f${++secuenciaUid}`;

type AsercionEditable = AsercionDiagrama & { uid: string };
type ContextoEditable = DiagramaContextoData & { uid: string };
interface ReferenciaEditable { uid: string; codigo: string }

function contextoVacio(motor: MotorDiagrama, tipo: TipoDiagrama): ContextoEditable {
  return { uid: nuevoUid(), nombre: '', titulo: '', tipo, motor, codigo: '' };
}

/** Editor de un ejercicio de diseño de diagramas (crear/editar). */
/** Serialización estable: ordena claves y omite lo vacío, a cualquier profundidad. */
function canonico(valor: unknown): string {
  const limpiar = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(limpiar);
    if (v && typeof v === 'object') {
      const salida: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) {
        const hijo = limpiar((v as Record<string, unknown>)[k]);
        // Un opcional en blanco y un opcional ausente son lo mismo para el
        // servidor, así que también han de serlo aquí.
        if (hijo === '' || hijo === undefined || hijo === null) continue;
        if (Array.isArray(hijo) && hijo.length === 0) continue;
        salida[k] = hijo;
      }
      return salida;
    }
    return v;
  };
  return JSON.stringify(limpiar(valor));
}

export default function EditorEjercicioDiagramaPage() {
  const { id: coleccionId, ejercicioId } = useParams<{ id: string; ejercicioId: string }>();
  const esNuevo = !ejercicioId || ejercicioId === 'nuevo';
  const { sessionToken } = useAuth();
  const navigate = useNavigate();

  const [titulo, setTitulo] = useState('');
  const [slug, setSlug] = useState('');
  const [orden, setOrden] = useState('0');
  const [categoriaId, setCategoriaId] = useState('');
  const [enunciado, setEnunciado] = useState('');
  const [motor, setMotor] = useState<MotorDiagrama>('mermaid');
  const [tipoDiagrama, setTipoDiagrama] = useState<TipoDiagrama>('clases');
  const [codigoInicial, setCodigoInicial] = useState('');
  const [aserciones, setAserciones] = useState<AsercionEditable[]>([]);
  const [contextos, setContextos] = useState<ContextoEditable[]>([]);
  const [referencias, setReferencias] = useState<ReferenciaEditable[]>([]);
  const [diagramaTrampa, setDiagramaTrampa] = useState('');

  const [categorias, setCategorias] = useState<{ id: string; nombre: string; bloqueId: string | null }[]>([]);
  const [bloques, setBloques] = useState<{ id: string; nombre: string }[]>([]);
  const [metadatos, setMetadatos] = useState<MetadatoAsercion[]>([]);

  /**
   * Texto tal cual se escribe en los parámetros que NO se guardan como texto
   * (números y listas). Sin este borrador, escribir «a,» se normalizaba a «a» en
   * la misma pulsación y el cursor saltaba: el valor guardado y el que se ve
   * tienen que poder diferir mientras se teclea.
   */
  const [borradores, setBorradores] = useState<Record<string, string>>({});

  const [cargando, setCargando] = useState(!esNuevo);
  /** ¿La carga trajo el ejercicio? En uno nuevo no hay nada que traer. */
  const [cargaOk, setCargaOk] = useState(esNuevo);
  const [guardando, setGuardando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [informe, setInforme] = useState<InformeVerificacionDiagrama | null>(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    if (esNuevo) return;
    try {
      const res = await fetch(`${API_BASE}/admin/ejercicios-diagrama/${ejercicioId}`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) throw new Error('No se pudo cargar el ejercicio');
      const { ejercicio } = (await res.json()) as { ejercicio: EjercicioDiagramaData };
      setTitulo(ejercicio.titulo);
      setSlug(ejercicio.slug);
      setOrden(String(ejercicio.orden));
      setCategoriaId(ejercicio.categoriaId ?? '');
      setEnunciado(ejercicio.enunciado);
      setMotor(ejercicio.motor);
      setTipoDiagrama(ejercicio.tipoDiagrama);
      setCodigoInicial(ejercicio.codigoInicial ?? '');
      setAserciones((ejercicio.aserciones ?? []).map((a) => ({ ...a, uid: nuevoUid() })));
      setContextos((ejercicio.diagramasContexto ?? []).map((d) => ({ ...d, uid: nuevoUid() })));
      setReferencias((ejercicio.diagramasReferencia ?? []).map((codigo) => ({ uid: nuevoUid(), codigo })));
      setDiagramaTrampa(ejercicio.diagramaTrampa ?? '');
      setCargaOk(true);
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'No se pudo cargar el ejercicio'));
    } finally {
      setCargando(false);
    }
  }, [esNuevo, ejercicioId, sessionToken]);

  useEffect(() => { cargar(); }, [cargar]);

  // Categorías + bloques de la colección (para el selector). El bloque no se
  // asigna aquí: solo agrupa el desplegable, porque con dos bloques un nombre
  // de categoría suelto ("Colecciones") se vuelve ambiguo.
  useEffect(() => {
    if (!coleccionId || !sessionToken) return;
    const cab = { 'x-session-token': sessionToken };
    Promise.all([
      fetch(`${API_BASE}/admin/colecciones/${coleccionId}/categorias-ejercicios`, { headers: cab })
        .then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_BASE}/admin/colecciones/${coleccionId}/bloques-ejercicios`, { headers: cab })
        .then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([jc, jb]: [{ categorias?: { id: string; nombre: string; bloqueId?: string | null }[] } | null,
        { bloques?: { id: string; nombre: string }[] } | null]) => {
        setCategorias((jc?.categorias ?? []).map((c) => ({ id: c.id, nombre: c.nombre, bloqueId: c.bloqueId ?? null })));
        setBloques((jb?.bloques ?? []).map((b) => ({ id: b.id, nombre: b.nombre })));
      })
      .catch(() => {});
  }, [coleccionId, sessionToken]);

  // Catálogo de comprobaciones. Es cerrado y vive en el servidor: el editor no
  // conoce ninguna aserción de antemano y genera su formulario desde aquí, así
  // que añadir una comprobación al juez no obliga a tocar esta pantalla.
  useEffect(() => {
    if (!sessionToken) return;
    fetch(`${API_BASE}/admin/catalogo-aserciones`, { headers: { 'x-session-token': sessionToken } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { metadatos?: MetadatoAsercion[] } | null) => setMetadatos(j?.metadatos ?? []))
      .catch(() => {});
  }, [sessionToken]);

  const metadatoPorTipo = useMemo(
    () => new Map(metadatos.map((m) => [m.tipo, m])),
    [metadatos],
  );

  // `aplicaA` vacío se lee como «a todos los tipos»: hay comprobaciones
  // genéricas (existe un nodo, sin nombres vagos) que no dependen de la notación.
  const aplicables = useMemo(
    () => metadatos.filter((m) => !m.aplicaA.length || m.aplicaA.includes(tipoDiagrama)),
    [metadatos, tipoDiagrama],
  );

  // --- Cambios sin guardar --------------------------------------------------

  /**
   * Retrato del formulario completo, en texto, para poder compararlo con lo
   * último cargado o guardado. Se serializa en vez de comparar campo a campo
   * porque el ejercicio incluye listas anidadas (aserciones con sus parámetros,
   * diagramas de contexto) que una comparación superficial no distinguiría.
   *
   * El `uid` queda fuera: es identidad de la interfaz y cambia con cada carga,
   * así que incluirlo marcaría cambios donde no los hay.
   */
  // Retrato CANÓNICO: claves ordenadas y campos vacíos descartados.
  //
  // Comparar el `JSON.stringify` en crudo comparaba la FORMA del objeto, no su
  // contenido: el servidor omite los opcionales en blanco, así que tocar y
  // vaciar un «Rótulo (opcional)» dejaba `rotulo: ''` donde la versión guardada
  // no tenía la clave, y el editor se quedaba con «cambios sin guardar» para
  // siempre, sin forma de deshacerlo desde la interfaz.
  const instantanea = useMemo(
    () => canonico({
      titulo,
      slug,
      orden,
      categoriaId,
      enunciado,
      motor,
      tipoDiagrama,
      codigoInicial,
      aserciones: aserciones.map(({ uid: _uid, ...a }) => a),
      contextos: contextos.map(({ uid: _uid, ...c }) => c),
      referencias: referencias.map((r) => r.codigo),
      diagramaTrampa,
    }),
    [titulo, slug, orden, categoriaId, enunciado, motor, tipoDiagrama, codigoInicial,
      aserciones, contextos, referencias, diagramaTrampa],
  );

  /** Retrato de la versión que hay en el servidor. `null` mientras se carga. */
  const [instantaneaGuardada, setInstantaneaGuardada] = useState<string | null>(null);

  // La línea base se toma en cuanto termina la carga, y una sola vez: es el
  // estado del formulario cuando todavía nadie lo ha tocado. En un ejercicio
  // nuevo el formulario arranca vacío y esa es su línea base.
  // Solo se toma línea base si la carga fue BIEN. Si falló, el formulario quedó
  // vacío y congelar esa nada como línea base dejaba «Verificar» habilitado
  // sobre una pantalla en blanco: el informe describiría el ejercicio real
  // guardado, que no es el que se está viendo.
  useEffect(() => {
    if (cargando || !cargaOk || instantaneaGuardada !== null) return;
    setInstantaneaGuardada(instantanea);
  }, [cargando, cargaOk, instantaneaGuardada, instantanea]);

  const hayCambiosSinGuardar = instantaneaGuardada !== null && instantanea !== instantaneaGuardada;
  /** Sin línea base no se puede afirmar nada sobre lo que hay en pantalla. */
  const sinLineaBase = instantaneaGuardada === null;

  // --- Aserciones ---------------------------------------------------------

  function agregarAsercion() {
    const primera = aplicables[0];
    setAserciones((prev) => [...prev, { uid: nuevoUid(), tipo: primera?.tipo ?? '', oculta: false, parametros: {} }]);
  }

  function quitarAsercion(uid: string) {
    setAserciones((prev) => prev.filter((a) => a.uid !== uid));
    limpiarBorradores(uid);
  }

  function moverAsercion(uid: string, delta: number) {
    setAserciones((prev) => {
      const i = prev.findIndex((a) => a.uid === uid);
      const destino = i + delta;
      if (i < 0 || destino < 0 || destino >= prev.length) return prev;
      const copia = [...prev];
      [copia[i], copia[destino]] = [copia[destino], copia[i]];
      return copia;
    });
  }

  function limpiarBorradores(uid: string) {
    setBorradores((prev) => {
      const siguiente: Record<string, string> = {};
      for (const [clave, valor] of Object.entries(prev)) {
        if (!clave.startsWith(`${uid}:`)) siguiente[clave] = valor;
      }
      return siguiente;
    });
  }

  function cambiarTipoAsercion(uid: string, tipo: string) {
    // Los parámetros se descartan a propósito: cada comprobación tiene los
    // suyos, y arrastrar los de la anterior dejaría claves que el servidor
    // rechazaría sin que se vean en el formulario.
    setAserciones((prev) => prev.map((a) => (a.uid === uid ? { ...a, tipo, parametros: {} } : a)));
    limpiarBorradores(uid);
  }

  function setCampoAsercion(uid: string, campo: 'oculta' | 'rotulo', valor: boolean | string) {
    setAserciones((prev) => prev.map((a) => (a.uid === uid ? { ...a, [campo]: valor } : a)));
  }

  function setParametro(uid: string, nombre: string, valor: unknown) {
    setAserciones((prev) => prev.map((a) => {
      if (a.uid !== uid) return a;
      const parametros = { ...(a.parametros ?? {}) };
      if (valor === undefined) delete parametros[nombre];
      else parametros[nombre] = valor;
      return { ...a, parametros };
    }));
  }

  function textoMostrado(uid: string, p: ParametroAsercion, valor: unknown): string {
    const borrador = borradores[`${uid}:${p.nombre}`];
    if (borrador !== undefined) return borrador;
    if (Array.isArray(valor)) return valor.join(', ');
    return valor === undefined || valor === null ? '' : String(valor);
  }

  function escribirParametro(uid: string, p: ParametroAsercion, texto: string) {
    setBorradores((prev) => ({ ...prev, [`${uid}:${p.nombre}`]: texto }));
    if (p.tipo === 'numero') {
      const n = Number(texto);
      setParametro(uid, p.nombre, texto.trim() === '' || Number.isNaN(n) ? undefined : n);
      return;
    }
    // lista-texto: se separa por comas y se descartan los huecos, así que
    // «Pedido, Cliente,» y «Pedido,Cliente» guardan lo mismo.
    const lista = texto.split(',').map((s) => s.trim()).filter(Boolean);
    setParametro(uid, p.nombre, lista.length ? lista : undefined);
  }

  function campoParametro(a: AsercionEditable, p: ParametroAsercion) {
    const valor = a.parametros?.[p.nombre];
    const etiqueta = p.requerido ? p.etiqueta : `${p.etiqueta} (opcional)`;

    if (p.tipo === 'opcion') {
      return (
        <div key={p.nombre} className={styles.parametro}>
          <label className={styles.campoGrupo}>
            <span className={styles.subLabel}>{etiqueta}</span>
            <select
              className={styles.select}
              value={typeof valor === 'string' ? valor : ''}
              onChange={(e) => setParametro(a.uid, p.nombre, e.target.value || undefined)}
              disabled={guardando}
            >
              <option value="">Sin especificar</option>
              {(p.opciones ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          {p.ayuda && <p className={styles.ayuda}>{p.ayuda}</p>}
        </div>
      );
    }

    if (p.tipo === 'texto') {
      return (
        <div key={p.nombre} className={styles.parametro}>
          <TextInput
            label={etiqueta}
            value={typeof valor === 'string' ? valor : ''}
            onChange={(v) => setParametro(a.uid, p.nombre, v === '' ? undefined : v)}
            disabled={guardando}
          />
          {p.ayuda && <p className={styles.ayuda}>{p.ayuda}</p>}
        </div>
      );
    }

    return (
      <div key={p.nombre} className={styles.parametro}>
        <TextInput
          label={p.tipo === 'lista-texto' ? `${etiqueta} — separados por comas` : etiqueta}
          type={p.tipo === 'numero' ? 'number' : 'text'}
          value={textoMostrado(a.uid, p, valor)}
          onChange={(v) => escribirParametro(a.uid, p, v)}
          disabled={guardando}
        />
        {p.ayuda && <p className={styles.ayuda}>{p.ayuda}</p>}
      </div>
    );
  }

  // --- Diagramas de contexto y de referencia ------------------------------

  function setContexto(uid: string, campo: keyof DiagramaContextoData, valor: string) {
    setContextos((prev) => prev.map((c) => (c.uid === uid ? { ...c, [campo]: valor } : c)));
  }

  /**
   * El tipo arrastra al motor: cada tipo solo se evalúa donde hay normalizador,
   * y dejar el motor anterior guardaría un par que hace fallar el ejercicio.
   */
  function cambiarTipo(nuevo: TipoDiagrama) {
    setTipoDiagrama(nuevo);
    const motores = motoresJuezDeTipo(nuevo);
    if (!motores.includes(motor) && motores[0]) setMotor(motores[0]);
  }

  function cambiarTipoContexto(uid: string, nuevo: string) {
    const motores = motoresJuezDeTipo(nuevo);
    setContextos((prev) =>
      prev.map((c) =>
        c.uid === uid
          ? { ...c, tipo: nuevo, motor: motores.includes(c.motor as MotorDiagrama) ? c.motor : motores[0] ?? c.motor }
          : c,
      ),
    );
  }

  function setReferencia(uid: string, codigo: string) {
    setReferencias((prev) => prev.map((r) => (r.uid === uid ? { ...r, codigo } : r)));
  }

  // --- Guardar ------------------------------------------------------------

  /** Devuelve el primer problema del formulario, o cadena vacía si no lo hay. */
  function validar(): string {
    if (!titulo.trim()) return 'El título es requerido';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return 'El slug debe ser minúsculas, números y guiones';

    for (const [i, c] of contextos.entries()) {
      if (!c.codigo.trim() && !c.nombre.trim()) continue; // fila en blanco: se descarta al guardar
      if (!c.nombre.trim()) return `El diagrama de contexto ${i + 1} necesita un nombre`;
      if (!c.codigo.trim()) return `El diagrama de contexto "${c.nombre}" no tiene código`;
    }

    for (const [i, a] of aserciones.entries()) {
      if (!a.tipo) return `La aserción ${i + 1} no tiene comprobación seleccionada`;
      const meta = metadatoPorTipo.get(a.tipo);
      if (!meta) continue; // catálogo aún sin cargar: la validación real es del servidor
      for (const p of meta.parametros) {
        if (!p.requerido) continue;
        const v = a.parametros?.[p.nombre];
        const vacio = v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
        if (vacio) return `La aserción ${i + 1} (${meta.etiqueta}) requiere "${p.etiqueta}"`;
      }
    }
    return '';
  }

  async function guardar() {
    const problema = validar();
    if (problema) { setError(problema); return; }

    setGuardando(true);
    setError('');

    const payload = {
      titulo: titulo.trim(),
      slug,
      orden: Number(orden) || 0,
      categoriaId: categoriaId || null,
      enunciado,
      motor,
      tipoDiagrama,
      codigoInicial,
      // El `uid` es identidad de la interfaz, no del dominio: nunca sale de aquí.
      aserciones: aserciones.map(({ uid: _uid, ...a }) => a),
      diagramasContexto: contextos
        .filter((c) => c.nombre.trim() && c.codigo.trim())
        .map(({ uid: _uid, ...c }) => ({ ...c, nombre: c.nombre.trim(), titulo: c.titulo?.trim() || undefined })),
      diagramasReferencia: referencias.map((r) => r.codigo).filter((c) => c.trim()),
      diagramaTrampa,
    };

    try {
      const url = esNuevo
        ? `${API_BASE}/admin/colecciones/${coleccionId}/ejercicios-diagrama`
        : `${API_BASE}/admin/ejercicios-diagrama/${ejercicioId}`;
      const res = await fetch(url, {
        method: esNuevo ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken ?? '' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || 'Error al guardar');
      }
      // Lo que hay en pantalla pasa a ser lo guardado: hoy se navega fuera justo
      // después, pero dejar la línea base desfasada haría que «Verificar»
      // quedara bloqueado sin cambios reales si esa navegación desaparece.
      setInstantaneaGuardada(instantanea);
      navigate(`/admin/contenidos/${coleccionId}/diagramas`);
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al guardar'));
    } finally {
      setGuardando(false);
    }
  }

  // --- Verificación de autoría --------------------------------------------

  async function verificar() {
    setVerificando(true);
    setError('');
    setInforme(null);
    try {
      const res = await fetch(`${API_BASE}/admin/ejercicios-diagrama/${ejercicioId}/verificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || 'Error al verificar');
      }
      const { informe: recibido } = (await res.json()) as { informe: InformeVerificacionDiagrama };
      setInforme(recibido);
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al verificar'));
    } finally {
      setVerificando(false);
    }
  }

  if (cargando) return <div className={styles.page}><p>Cargando...</p></div>;

  const volverA = `/admin/contenidos/${coleccionId}/diagramas`;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link to={volverA} className={styles.volver}>
          <Icon name="arrow_back" size="sm" />
          <span>Diagramas</span>
        </Link>
        <h1 className={styles.pageTitle}>{esNuevo ? 'Nuevo ejercicio de diagrama' : 'Editar ejercicio de diagrama'}</h1>
      </div>

      {error && <div className={styles.error} onClick={() => setError('')}>{error}</div>}

      <div className={styles.grid}>
        <TextInput label="Título" icon="title" value={titulo} onChange={setTitulo} disabled={guardando} />
        <TextInput label="Slug (URL)" icon="link" placeholder="diagrama-de-clases-pedidos" value={slug} onChange={setSlug} disabled={guardando} />
        <TextInput label="Orden" type="number" icon="sort" value={orden} onChange={setOrden} disabled={guardando} />
      </div>

      {/* Los <label> ENVUELVEN a su control, igual que en las pantallas del
          alumno: sin asociación, un lector de pantalla anuncia estos desplegables
          sin nombre y el rótulo de al lado queda como texto suelto. El pie de
          ayuda se deja FUERA del <label> porque un <p> no es contenido válido
          dentro de una etiqueta y engordaría el nombre anunciado. */}
      <div className={styles.field}>
        <label className={styles.campoGrupo}>
          <span className={styles.label}>Categoría</span>
          <select
            className={styles.select}
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            disabled={guardando}
          >
            <option value="">Sin categoría</option>
            {/* Agrupadas por bloque; las que no tienen ninguno van sueltas al
                final, que es también como las pinta el listado del alumno. */}
            {bloques.map((b) => {
              const suyas = categorias.filter((c) => c.bloqueId === b.id);
              if (!suyas.length) return null;
              return (
                <optgroup key={b.id} label={b.nombre}>
                  {suyas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </optgroup>
              );
            })}
            {categorias
              .filter((c) => !c.bloqueId || !bloques.some((b) => b.id === c.bloqueId))
              .map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
        <p className={styles.hint}>Las categorías se administran desde la lista de diagramas de la colección.</p>
      </div>

      {/* El TIPO va primero porque condiciona al motor: cada tipo se evalúa en
          los motores que tienen normalizador, y hoy es exactamente uno. */}
      <div className={styles.grid}>
        <div>
          <label className={styles.campoGrupo}>
            <span className={styles.label}>Tipo de diagrama</span>
            <select
              className={styles.select}
              value={tipoDiagrama}
              onChange={(e) => cambiarTipo(e.target.value as TipoDiagrama)}
              disabled={guardando}
            >
              {TIPOS_JUZGABLES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </label>
          <p className={styles.hint}>Determina qué comprobaciones del catálogo están disponibles.</p>
        </div>
        <div>
          <label className={styles.campoGrupo}>
            <span className={styles.label}>Motor</span>
            {/* Solo los motores en los que el juez SABE leer este tipo. Ofrecer
                cualquier otro deja crear un ejercicio cuyo envío responde 500
                para todo el grupo, porque no hay normalizador que lo lea. */}
            <select
              className={styles.select}
              value={motor}
              onChange={(e) => setMotor(e.target.value as MotorDiagrama)}
              disabled={guardando || motoresJuezDeTipo(tipoDiagrama).length < 2}
            >
              {motoresJuezDeTipo(tipoDiagrama).map((m) => (
                <option key={m} value={m}>{etiquetaMotorDiagrama(m)}</option>
              ))}
            </select>
          </label>
          <p className={styles.hint}>
            El juez solo evalúa «{etiquetaTipoDiagrama(tipoDiagrama)}» en{' '}
            {motoresJuezDeTipo(tipoDiagrama).map(etiquetaMotorDiagrama).join(' y ')}.
          </p>
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Enunciado (Markdown)</label>
        <CodeMirror
          value={enunciado}
          height="240px"
          theme={oneDark}
          extensions={ENUNCIADO_EXT}
          onChange={setEnunciado}
          editable={!guardando}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Código inicial del alumno</label>
        <p className={styles.hint}>
          Punto de partida que aparece en el editor del alumno. Suele bastar con la cabecera de la
          notación y un comentario, para que el ejercicio no empiece con un lienzo en blanco.
        </p>
        <div className={styles.split}>
          <CodeMirror
            value={codigoInicial}
            height="260px"
            theme={oneDark}
            extensions={CODIGO_EXT}
            onChange={setCodigoInicial}
            editable={!guardando}
          />
          <VistaPreviaDiagrama codigo={codigoInicial} motor={motor} altura={260} />
        </div>
      </div>

      {/* --- Aserciones --- */}
      <div className={styles.field}>
        <label className={styles.label}>Comprobaciones</label>
        <p className={styles.hint}>
          Se evalúan en orden sobre el modelo del diagrama, no sobre su texto. Las marcadas como
          ocultas le indican al alumno que fallaron, sin decir por qué.
        </p>

        {!metadatos.length && (
          <p className={styles.hint}>No se pudo cargar el catálogo de comprobaciones.</p>
        )}

        <div className={styles.lista}>
          {aserciones.map((a, i) => {
            const meta = metadatoPorTipo.get(a.tipo);
            // Una aserción guardada puede haber dejado de aplicar si después se
            // cambió el tipo de diagrama. Se muestra igualmente, señalada: es un
            // error del ejercicio y esconderla lo volvería invisible.
            const noAplica = Boolean(meta) && !aplicables.some((m) => m.tipo === a.tipo);
            return (
              <div key={a.uid} className={styles.tarjeta}>
                <div className={styles.tarjetaHead}>
                  <span className={styles.tarjetaNum}>Aserción {i + 1}</span>
                  <label className={styles.ocultoLabel}>
                    <input
                      type="checkbox"
                      checked={Boolean(a.oculta)}
                      onChange={(e) => setCampoAsercion(a.uid, 'oculta', e.target.checked)}
                      disabled={guardando}
                    />
                    <span>Oculta</span>
                  </label>
                  {/* `aria-label` con el número de fila: el contenido de estos
                      botones es solo la ligadura de Material Icons, que se
                      anuncia como «arrow_upward», y además hay una botonera
                      idéntica por aserción. */}
                  <div className={styles.botonera}>
                    <button
                      type="button"
                      className={styles.iconoBtn}
                      onClick={() => moverAsercion(a.uid, -1)}
                      disabled={guardando || i === 0}
                      title="Subir"
                      aria-label={`Subir la aserción ${i + 1}`}
                    >
                      <Icon name="arrow_upward" size="sm" />
                    </button>
                    <button
                      type="button"
                      className={styles.iconoBtn}
                      onClick={() => moverAsercion(a.uid, 1)}
                      disabled={guardando || i === aserciones.length - 1}
                      title="Bajar"
                      aria-label={`Bajar la aserción ${i + 1}`}
                    >
                      <Icon name="arrow_downward" size="sm" />
                    </button>
                    <button
                      type="button"
                      className={styles.quitar}
                      onClick={() => quitarAsercion(a.uid)}
                      disabled={guardando}
                      title="Quitar aserción"
                      aria-label={`Quitar la aserción ${i + 1}`}
                    >
                      <Icon name="delete" size="sm" />
                    </button>
                  </div>
                </div>

                <label className={styles.campoGrupo}>
                  <span className={styles.subLabel}>Comprobación</span>
                  <select
                    className={styles.select}
                    value={a.tipo}
                    onChange={(e) => cambiarTipoAsercion(a.uid, e.target.value)}
                    disabled={guardando}
                  >
                    <option value="">Sin seleccionar</option>
                    {FAMILIAS.map((f) => {
                      const suyas = aplicables.filter((m) => m.familia === f.key);
                      if (!suyas.length) return null;
                      return (
                        <optgroup key={f.key} label={f.label}>
                          {suyas.map((m) => <option key={m.tipo} value={m.tipo}>{m.etiqueta}</option>)}
                        </optgroup>
                      );
                    })}
                    {/* La opción vigente entra aunque no aplique, o el desplegable
                        se vería vacío y guardar la sustituiría en silencio. */}
                    {noAplica && meta && (
                      <option value={meta.tipo}>{meta.etiqueta} — no aplica a {etiquetaTipoDiagrama(tipoDiagrama)}</option>
                    )}
                  </select>
                </label>

                {meta && <p className={styles.descripcion}>{meta.descripcion}</p>}
                {noAplica && (
                  <p className={styles.aviso}>
                    Esta comprobación no aplica al tipo de diagrama seleccionado.
                  </p>
                )}

                {meta && meta.parametros.length > 0 && (
                  <div className={styles.parametros}>
                    {meta.parametros.map((p) => campoParametro(a, p))}
                  </div>
                )}

                <div className={styles.parametro}>
                  <TextInput
                    label="Rótulo (opcional)"
                    placeholder="Texto que sustituye a la descripción automática"
                    value={a.rotulo ?? ''}
                    onChange={(v) => setCampoAsercion(a.uid, 'rotulo', v)}
                    disabled={guardando}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <DashButton variant="outline" onClick={agregarAsercion} disabled={guardando || !aplicables.length}>
          + Agregar comprobación
        </DashButton>
      </div>

      {/* --- Diagramas de contexto --- */}
      <div className={styles.field}>
        <label className={styles.label}>Diagramas de contexto</label>
        <p className={styles.hint}>
          Diagramas que el ejercicio da por hechos y contra los que se cruzan las comprobaciones de la
          familia «cruzada». El nombre es el identificador con el que las aserciones los referencian.
        </p>
        <div className={styles.lista}>
          {contextos.map((c, i) => (
            <div key={c.uid} className={styles.tarjeta}>
              <div className={styles.tarjetaHead}>
                <span className={styles.tarjetaNum}>Contexto {i + 1}</span>
                <div className={styles.botonera}>
                  <button
                    type="button"
                    className={styles.quitar}
                    onClick={() => setContextos((prev) => prev.filter((x) => x.uid !== c.uid))}
                    disabled={guardando}
                    title="Quitar diagrama de contexto"
                    aria-label={`Quitar el diagrama de contexto ${i + 1}`}
                  >
                    <Icon name="delete" size="sm" />
                  </button>
                </div>
              </div>

              <div className={styles.gridContexto}>
                <TextInput label="Nombre (referencia)" placeholder="clases" value={c.nombre} onChange={(v) => setContexto(c.uid, 'nombre', v)} disabled={guardando} />
                <TextInput label="Título visible (opcional)" value={c.titulo ?? ''} onChange={(v) => setContexto(c.uid, 'titulo', v)} disabled={guardando} />
                <div>
                  <label className={styles.campoGrupo}>
                    <span className={styles.subLabel}>Tipo</span>
                    <select className={styles.select} value={c.tipo} onChange={(e) => cambiarTipoContexto(c.uid, e.target.value)} disabled={guardando}>
                      {TIPOS_JUZGABLES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                  </label>
                </div>
                <div>
                  <label className={styles.campoGrupo}>
                    <span className={styles.subLabel}>Motor</span>
                    {/* Un par (tipo, motor) sin normalizador en un diagrama de
                        CONTEXTO es peor que en el del alumno: `evaluarDiagrama`
                        parsea el contexto primero y lanza antes de mirar nada. */}
                    <select className={styles.select} value={c.motor} onChange={(e) => setContexto(c.uid, 'motor', e.target.value)} disabled={guardando || motoresJuezDeTipo(c.tipo).length < 2}>
                      {motoresJuezDeTipo(c.tipo).map((m) => (
                        <option key={m} value={m}>{etiquetaMotorDiagrama(m)}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className={styles.split}>
                <CodeMirror
                  value={c.codigo}
                  height="220px"
                  theme={oneDark}
                  extensions={CODIGO_EXT}
                  onChange={(v) => setContexto(c.uid, 'codigo', v)}
                  editable={!guardando}
                />
                <VistaPreviaDiagrama codigo={c.codigo} motor={c.motor} altura={220} />
              </div>
            </div>
          ))}
        </div>
        <DashButton variant="outline" onClick={() => setContextos((prev) => [...prev, contextoVacio(motoresJuezDeTipo(tipoDiagrama)[0] ?? motor, tipoDiagrama)])} disabled={guardando}>
          + Agregar diagrama de contexto
        </DashButton>
      </div>

      {/* --- Diagramas de referencia --- */}
      <div className={styles.field}>
        <label className={styles.label}>Diagramas de referencia</label>
        <p className={styles.hint}>
          Soluciones correctas del ejercicio. La verificación exige que TODAS pasen todas las
          comprobaciones; varias referencias sirven para admitir soluciones distintas pero válidas.
        </p>
        <div className={styles.lista}>
          {referencias.map((r, i) => (
            <div key={r.uid} className={styles.tarjeta}>
              <div className={styles.tarjetaHead}>
                <span className={styles.tarjetaNum}>Referencia {i + 1}</span>
                <div className={styles.botonera}>
                  <button
                    type="button"
                    className={styles.quitar}
                    onClick={() => setReferencias((prev) => prev.filter((x) => x.uid !== r.uid))}
                    disabled={guardando}
                    title="Quitar referencia"
                    aria-label={`Quitar el diagrama de referencia ${i + 1}`}
                  >
                    <Icon name="delete" size="sm" />
                  </button>
                </div>
              </div>
              <div className={styles.split}>
                <CodeMirror
                  value={r.codigo}
                  height="220px"
                  theme={oneDark}
                  extensions={CODIGO_EXT}
                  onChange={(v) => setReferencia(r.uid, v)}
                  editable={!guardando}
                />
                <VistaPreviaDiagrama codigo={r.codigo} motor={motor} altura={220} />
              </div>
            </div>
          ))}
        </div>
        <DashButton variant="outline" onClick={() => setReferencias((prev) => [...prev, { uid: nuevoUid(), codigo: '' }])} disabled={guardando}>
          + Agregar diagrama de referencia
        </DashButton>
      </div>

      {/* --- Diagrama trampa --- */}
      <div className={styles.field}>
        <label className={styles.label}>Diagrama trampa</label>
        <p className={styles.hint}>
          Solución plausible pero incorrecta. La verificación exige que FALLE alguna comprobación: si
          pasa, el ejercicio no distingue una respuesta buena de una mala.
        </p>
        <div className={styles.split}>
          <CodeMirror
            value={diagramaTrampa}
            height="220px"
            theme={oneDark}
            extensions={CODIGO_EXT}
            onChange={setDiagramaTrampa}
            editable={!guardando}
          />
          <VistaPreviaDiagrama codigo={diagramaTrampa} motor={motor} altura={220} />
        </div>
      </div>

      {/* --- Verificación --- */}
      <div className={styles.field}>
        <label className={styles.label}>Verificación del ejercicio</label>
        <p className={styles.hint}>
          Comprueba el ejercicio, no la respuesta de un alumno: corre las comprobaciones contra las
          referencias y la trampa. Se ejecuta sobre la última versión guardada.
        </p>
        {/* Deshabilitado con cambios en pantalla: el servidor verifica la última
            versión GUARDADA, así que el informe hablaría de un ejercicio distinto
            del que se está viendo —y sus fallos, o su ausencia, serían
            inexplicables—. El motivo va en el `title` y también a la vista,
            porque un botón apagado no puede explicarse solo. */}
        <DashButton
          variant="outline"
          onClick={verificar}
          disabled={esNuevo || guardando || verificando || hayCambiosSinGuardar || sinLineaBase}
          title={
            hayCambiosSinGuardar
              ? 'Hay cambios sin guardar: la verificación corre sobre la última versión guardada del ejercicio. Guarda primero.'
              : undefined
          }
        >
          {verificando ? 'Verificando...' : 'Verificar'}
        </DashButton>
        {esNuevo && <p className={styles.hint}>Disponible una vez creado el ejercicio.</p>}
        {!esNuevo && hayCambiosSinGuardar && (
          <p className={styles.hint} role="status">
            Hay cambios sin guardar. La verificación se ejecuta sobre la última versión guardada, así
            que primero hay que guardar el ejercicio.
          </p>
        )}

        {informe && (
          <div className={`${styles.informe} ${informe.ok ? styles.informeOk : styles.informeMal}`}>
            <p className={styles.informeTitulo}>
              {informe.ok
                ? 'El ejercicio es consistente: las referencias pasan y la trampa se detecta.'
                : 'El ejercicio tiene problemas pendientes.'}
            </p>

            {informe.problemas.length > 0 && (
              <ul className={styles.informeLista}>
                {informe.problemas.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            )}

            {informe.referencias.map((r) => (
              <div key={r.indice} className={styles.informeFila}>
                <span className={styles.informeEtiqueta}>
                  Referencia {r.indice + 1}: {VEREDICTOS[r.veredicto] ?? r.veredicto}
                </span>
                <span className={styles.informeConteo}>
                  {r.asercionesPasadas} de {r.asercionesTotales} comprobaciones
                </span>
                {r.fallos.length > 0 && (
                  <ul className={styles.informeLista}>
                    {r.fallos.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                )}
              </div>
            ))}

            {informe.trampa && (
              <div className={styles.informeFila}>
                <span className={styles.informeEtiqueta}>
                  Trampa: {informe.trampa.detecta
                    ? 'detectada correctamente'
                    : 'NO detectada — la trampa pasa todas las comprobaciones'}
                </span>
                <span className={styles.informeConteo}>
                  Veredicto: {VEREDICTOS[informe.trampa.veredicto] ?? informe.trampa.veredicto}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <DashButton variant="outline" onClick={() => navigate(volverA)} disabled={guardando}>
          Cancelar
        </DashButton>
        <DashButton onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando...' : esNuevo ? 'Crear' : 'Guardar'}
        </DashButton>
      </div>
    </div>
  );
}
