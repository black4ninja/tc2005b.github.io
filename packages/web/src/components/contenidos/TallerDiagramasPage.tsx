import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { useAuth } from '../../context/AuthContext';
import { useCargaGated } from '../../hooks/useCargaGated';
import {
  TIPOS_CATALOGO,
  agrupadoDiagramas,
  etiquetaMotorDiagrama,
  etiquetaTipoDiagrama,
} from '../../lib/diagramas/etiquetas';
import {
  motorPorOmisionDeTipo,
  motoresDeTipo,
  plantillaDiagrama,
} from '../../lib/diagramas/plantillas';
import type { MotorDiagrama } from '../../types/contenidos';
// La MISMA vista previa del solver y del editor de autoría, no una copia: si el
// taller dibujara con otro componente, un diagrama podría verse bien aquí y
// romperse al llevarlo a un ejercicio sin que nadie lo notara.
import VistaPreviaDiagrama from '../dashboard/pages/EditorEjercicioDiagramaPage/VistaPreviaDiagrama';
import Icon from '../dashboard/atoms/Icon/Icon';
import styles from './TallerDiagramas.module.css';

/**
 * Taller de diagramas: dibujo libre, sin ejercicio ni juez.
 *
 * Lo que se guarda aquí es material del alumno, no del curso: no cuelga de una
 * colección, nadie lo califica y solo su autor lo ve. Existe porque un ejercicio
 * obliga a modelar lo que pide el enunciado, y aprender una notación requiere
 * además poder probarla sobre problemas propios.
 */

/**
 * Qué mitades del área de trabajo se ven, con los mismos tres estados y los
 * mismos iconos que el solver y que el editor del CMS: quien ya usó cualquiera
 * de los dos no tiene que aprender otro control aquí.
 */
type Vista = 'codigo' | 'ambos' | 'preview';

/** Clave propia: la preferencia del taller es independiente de la del solver. */
const VISTA_KEY = 'taller:vista';
const LISTA_KEY = 'taller:lista';
/** Copia local del trabajo sin guardar. Ver `leerBorrador` para el porqué. */
/**
 * Clave del borrador, con el id del ALUMNO dentro.
 *
 * Sin él, el borrador es del navegador y no de la persona: cerrar sesión solo
 * limpia el token, así que en un equipo de laboratorio el siguiente alumno se
 * encontraba el trabajo sin guardar del anterior, con un `seleccion` apuntando a
 * un diagrama ajeno cuyo guardado responde 404.
 */
function claveBorrador(usuarioId: string): string {
  return `taller:borrador:${usuarioId}`;
}

/** La lista se ve por defecto: plegarla es una decisión del alumno. */
function leerListaVisible(): boolean {
  return localStorage.getItem(LISTA_KEY) !== 'oculta';
}

function leerVista(): Vista {
  const v = localStorage.getItem(VISTA_KEY);
  return v === 'codigo' || v === 'preview' ? v : 'ambos';
}

/** Espejo del tope del API (`NOMBRE_MAX`): avisa antes de gastar una petición. */
const NOMBRE_MAX = 120;

interface DiagramaResumen {
  id: string;
  nombre: string;
  motor: string;
  tipoDiagrama: string;
  updatedAt: string;
}

interface DiagramaCompleto extends DiagramaResumen {
  codigo: string;
  createdAt: string;
}

/**
 * Lo que el editor tiene en pantalla, sin identificador: vale para un borrador.
 *
 * `tipo` es `string` y no la unión del juez: en el taller no hay evaluación, así
 * que vale cualquier tipo del catálogo, incluidos los que ningún normalizador
 * sabe leer todavía.
 */
interface Estado {
  nombre: string;
  motor: MotorDiagrama;
  tipo: string;
  codigo: string;
}

/**
 * Acción que espera confirmación por haber cambios sin guardar. Se guarda la
 * acción entera, y no solo un aviso, para poder ejecutarla tal cual si el alumno
 * confirma: preguntar y luego obligarle a repetir el gesto sería peor que no
 * preguntar.
 */
type Pendiente = { clase: 'abrir'; id: string } | { clase: 'nuevo' };

// --- Plantillas de arranque -------------------------------------------------

/**
 * Los esqueletos de arranque viven en `@tc2005b/diagramas-catalogo`, junto a la
 * definición de cada tipo, y no aquí: el editor de autoría y las semillas los
 * necesitan igual, y tres copias del mismo esqueleto se separan a la primera
 * corrección.
 */

const TIPO_POR_OMISION = 'clases';

/** Borrador en blanco de un tipo, con su motor y su plantilla. */
function estadoDeTipo(tipo: string): Estado {
  const motor = motorPorOmisionDeTipo(tipo);
  return { nombre: '', motor, tipo, codigo: plantillaDiagrama(tipo, motor) };
}

const BORRADOR_INICIAL: Estado = estadoDeTipo(TIPO_POR_OMISION);

// --- Normalización de lo que llega del API ----------------------------------

const CLAVES_TIPO: string[] = TIPOS_CATALOGO.map((t) => t.key);

/**
 * El API sirve `motor` y `tipoDiagrama` como cadenas. Se acotan al catálogo
 * antes de tocar el estado para que un valor desconocido —un despliegue más
 * nuevo del servidor— caiga en el valor por omisión en vez de dejar los `select`
 * sin ninguna opción seleccionada.
 */
function aTipo(valor: string): string {
  return CLAVES_TIPO.includes(valor) ? valor : TIPO_POR_OMISION;
}

/**
 * El motor se acota a los que dibujan ESE tipo, no a los dos de siempre: la
 * mayoría del catálogo existe en un solo motor, y dejar seleccionado el otro
 * pintaría un editor cuya vista previa no puede funcionar.
 */
function aMotor(valor: string, tipo: string): MotorDiagrama {
  const posibles = motoresDeTipo(tipo);
  if (posibles.includes(valor as MotorDiagrama)) return valor as MotorDiagrama;
  // `motorPorOmisionDeTipo` y NO `posibles[0]`: los tres tipos de arquitectura
  // se dibujan también en Mermaid con una aproximación en `flowchart`, y elegir
  // esa entregaría al alumno un esqueleto que la notación del curso rechaza.
  return motorPorOmisionDeTipo(tipo);
}

function estadoDesde(d: DiagramaCompleto): Estado {
  const tipo = aTipo(d.tipoDiagrama);
  return {
    nombre: d.nombre,
    motor: aMotor(d.motor, tipo),
    tipo,
    codigo: d.codigo,
  };
}

/** Comparación campo a campo: decide si hay cambios sin guardar. */
function mismoEstado(a: Estado, b: Estado): boolean {
  return a.nombre === b.nombre && a.motor === b.motor && a.tipo === b.tipo && a.codigo === b.codigo;
}

// --- Borrador local ---------------------------------------------------------

/**
 * Copia local de lo que hay en el editor cuando difiere de lo guardado en BD.
 *
 * Se conserva también `referencia` —el estado del servidor— porque al volver hay
 * que poder seguir distinguiendo «cambiado» de «igual a lo guardado» sin pedirle
 * el diagrama otra vez al API.
 */
interface Borrador {
  seleccion: string | null;
  editor: Estado;
  referencia: Estado;
  guardadoEn: string;
}

/**
 * Lee un `Estado` de datos sin tipar (JSON del almacenamiento local).
 *
 * Todo lo que viene de `localStorage` es texto que pudo escribir otra versión de
 * esta pantalla, así que se valida campo a campo: un borrador corrupto se
 * descarta en vez de dejar el editor con `undefined` dentro.
 */
function estadoDesdeCrudo(valor: unknown): Estado | null {
  if (typeof valor !== 'object' || valor === null) return null;
  const o = valor as Record<string, unknown>;
  if (typeof o.nombre !== 'string' || typeof o.codigo !== 'string') return null;
  if (typeof o.motor !== 'string' || typeof o.tipo !== 'string') return null;
  const tipo = aTipo(o.tipo);
  return { nombre: o.nombre, motor: aMotor(o.motor, tipo), tipo, codigo: o.codigo };
}

/**
 * Recupera el borrador local, si lo hay.
 *
 * LIMITACIÓN CONOCIDA que este borrador compensa: la aplicación monta un
 * `<BrowserRouter>`, no un router de datos, así que `useBlocker` no está
 * disponible y `beforeunload` no se dispara con la navegación interna de React
 * Router. Al pulsar «Diagramas» en el menú —un enlace del armazón, fuera de esta
 * pantalla— no hay ningún punto en el que preguntar antes de desmontar. En vez
 * de interceptar la navegación, el taller escribe el trabajo pendiente aquí y lo
 * restaura al volver, avisando de que procede de un borrador.
 *
 * Lo que NO cubre: el borrador es de este navegador y este perfil, y solo hay
 * uno —el último—, de modo que trabajar en dos pestañas del taller a la vez deja
 * viva la última que escriba. Tampoco sobrevive a un `localStorage` lleno o
 * deshabilitado (navegación privada), caso en el que se ignora sin avisar.
 */
function leerBorrador(usuarioId: string | undefined): Borrador | null {
  if (!usuarioId) return null;
  try {
    const crudo = localStorage.getItem(claveBorrador(usuarioId));
    if (!crudo) return null;
    const dato: unknown = JSON.parse(crudo);
    if (typeof dato !== 'object' || dato === null) return null;
    const o = dato as Record<string, unknown>;
    const editor = estadoDesdeCrudo(o.editor);
    const referencia = estadoDesdeCrudo(o.referencia);
    if (!editor || !referencia) return null;
    return {
      seleccion: typeof o.seleccion === 'string' ? o.seleccion : null,
      editor,
      referencia,
      guardadoEn: typeof o.guardadoEn === 'string' ? o.guardadoEn : '',
    };
  } catch {
    // JSON inválido o almacenamiento bloqueado: se arranca en limpio.
    return null;
  }
}

function olvidarBorrador(usuarioId: string | undefined) {
  if (!usuarioId) return;
  try {
    localStorage.removeItem(claveBorrador(usuarioId));
  } catch {
    // Sin almacenamiento no hay nada que olvidar.
  }
}

const FECHA = new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Fecha legible, o cadena vacía si el dato no es una fecha. El sello del
 * borrador viene de `localStorage`, así que puede ser cualquier texto: sin esta
 * comprobación, un valor corrupto tumbaría el render con `Invalid time value`.
 */
function fechaLegible(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : FECHA.format(d);
}

export default function TallerDiagramasPage() {
  const { sessionToken, user } = useAuth();

  const {
    data,
    cargando: cargandoLista,
    error: errorLista,
    noEncontrado,
    reintentar: recargarLista,
  } = useCargaGated<{ diagramas: DiagramaResumen[] }>('/api/me/diagramas-taller');

  /**
   * El API ya ordena por modificación reciente, pero el orden se reafirma aquí:
   * la lista se repinta tras guardar, y depender del servidor para algo que la
   * pantalla afirma («ordenada por modificación») deja el orden a merced de un
   * cambio en el controlador.
   */
  const diagramas = useMemo(() => {
    const lista = data?.diagramas ?? [];
    return [...lista].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [data]);

  /**
   * Borrador local de la visita anterior, leído UNA vez al montar. Se restaura
   * en el primer render en lugar de en un efecto: así el editor nunca llega a
   * pintar la plantilla vacía que el alumno vería como «se ha perdido».
   */
  const [recuperado] = useState<Borrador | null>(() => leerBorrador(user?.id));

  /**
   * Tipo pedido en la URL (`?tipo=`), con el que entra quien pulsa «Abrir en
   * modo libre» en una tarjeta del catálogo. Sin esto, la tarjeta prometía abrir
   * ESE tipo y dejaba el taller en el último que se hubiera usado.
   *
   * Solo manda cuando NO hay trabajo recuperado: el borrador es trabajo del
   * alumno y pisarlo con una plantilla sería peor que ignorar el enlace.
   */
  const [tipoPedido] = useState<string | null>(() => {
    const pedido = new URLSearchParams(window.location.search).get('tipo');
    return pedido && CLAVES_TIPO.includes(pedido) ? pedido : null;
  });
  /** El aviso se muestra hasta que el alumno lo cierra o descarta el borrador. */
  const [avisoBorrador, setAvisoBorrador] = useState<boolean>(recuperado !== null);

  // `null` significa borrador: hay algo en el editor que todavía no existe en BD.
  const [seleccion, setSeleccion] = useState<string | null>(recuperado?.seleccion ?? null);
  const [editor, setEditor] = useState<Estado>(
    recuperado?.editor ?? (tipoPedido ? estadoDeTipo(tipoPedido) : BORRADOR_INICIAL),
  );
  /** Lo último guardado o cargado: contra esto se mide si hay cambios. */
  const [referencia, setReferencia] = useState<Estado>(
    recuperado?.referencia ?? (tipoPedido ? estadoDeTipo(tipoPedido) : BORRADOR_INICIAL),
  );

  /**
   * Texto EXACTO de la última plantilla precargada.
   *
   * Sirve para distinguir «el editor trae una plantilla intacta» de «el alumno
   * escribió esto». Sin esa distinción habría que elegir entre dos comportamientos
   * malos al cambiar de tipo: pisar lo escrito, o dejar en pantalla la plantilla
   * de un tipo que ya no es el seleccionado.
   */
  // Lo restaurado es trabajo del alumno, nunca una plantilla intacta: se arranca
  // sin plantilla vigente para que cambiar de tipo no lo sobrescriba.
  const plantillaCargada = useRef<string>(
    recuperado ? '' : (tipoPedido ? plantillaDiagrama(tipoPedido, motorPorOmisionDeTipo(tipoPedido)) : BORRADOR_INICIAL.codigo),
  );

  const [vista, setVistaState] = useState<Vista>(leerVista);

  const [listaVisible, setListaVisibleState] = useState<boolean>(leerListaVisible);


  function setListaVisible(v: boolean) {

    setListaVisibleState(v);

    localStorage.setItem(LISTA_KEY, v ? 'visible' : 'oculta');

  }
  const [cargandoDiagrama, setCargandoDiagrama] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  /**
   * Aviso de que el motor cambió solo, al elegir un tipo que el anterior no
   * dibuja, teniendo el alumno código propio en el editor.
   *
   * Es un estado propio y no un `aviso` porque este NO puede caducar a los tres
   * segundos: describe por qué la vista previa dejó de funcionar y cómo
   * deshacerlo, y esa explicación tiene que seguir en pantalla mientras el
   * problema siga ahí.
   */
  const [motorCambiado, setMotorCambiado] = useState<
    { de: MotorDiagrama; a: MotorDiagrama; tipo: string } | null
  >(null);
  const [renombrando, setRenombrando] = useState<{ id: string; valor: string } | null>(null);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState<string | null>(null);

  const campoNombre = useRef<HTMLInputElement | null>(null);

  const hayCambios = !mismoEstado(editor, referencia);

  function setVista(v: Vista) {
    setVistaState(v);
    localStorage.setItem(VISTA_KEY, v);
  }

  // Con una sola mitad visible el dibujo puede ser más alto sin pedir scroll.
  const alturaPaneles = vista === 'ambos' ? 460 : 620;

  // Los avisos se retiran solos: son confirmaciones de algo que ya ocurrió y, si
  // se quedaran fijos, el siguiente gesto los leería como su propio resultado.
  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(''), 3000);
    return () => window.clearTimeout(t);
  }, [aviso]);

  /**
   * Recarga o cierre de pestaña con trabajo sin guardar: se pregunta antes de
   * irse. El borrador local ya evitaría la pérdida, pero preguntar sigue siendo
   * mejor que recuperar, y `beforeunload` solo cubre este caso —la navegación
   * interna de React Router no lo dispara—.
   */
  useEffect(() => {
    if (!hayCambios) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [hayCambios]);

  /**
   * Autoguardado del borrador local (ver `leerBorrador` para la limitación que
   * compensa). Se escribe con retardo para no tocar `localStorage` en cada
   * pulsación, y se borra en cuanto el editor vuelve a coincidir con lo guardado
   * en BD: dejar ahí un borrador ya obsoleto haría aparecer el aviso de
   * recuperación sin que hubiera nada que recuperar.
   */
  const escribirBorrador = useCallback(() => {
    if (!user?.id) return;
    const borrador: Borrador = { seleccion, editor, referencia, guardadoEn: new Date().toISOString() };
    try {
      localStorage.setItem(claveBorrador(user.id), JSON.stringify(borrador));
    } catch {
      // Cuota llena o almacenamiento deshabilitado: no se puede hacer nada útil
      // aquí, y avisar de un mecanismo interno solo distraería del trabajo. El
      // aviso de `beforeunload` sigue cubriendo recarga y cierre.
    }
  }, [user?.id, seleccion, editor, referencia]);

  useEffect(() => {
    if (!hayCambios) {
      olvidarBorrador(user?.id);
      return;
    }
    const t = window.setTimeout(escribirBorrador, 600);
    return () => {
      window.clearTimeout(t);
      // Y se vuelca lo pendiente AL DESMONTAR, que es exactamente el momento que
      // este mecanismo existe para cubrir: con solo el retardo, quien escribe
      // sin pausas de 600 ms y navega perdía todo, porque la limpieza del efecto
      // cancelaba la única escritura que quedaba por hacer.
      escribirBorrador();
    };
  }, [hayCambios, escribirBorrador, user?.id]);

  /**
   * Un borrador restaurado apunta a un id que pudo cambiar o desaparecer desde
   * otra pestaña o desde otro equipo. Si ya no está en la lista del alumno, se
   * suelta la selección: guardar creará uno nuevo con ese contenido. Sin esto,
   * «Guardar cambios» hacía PUT contra un id inexistente y respondía 404 una y
   * otra vez, dejando el trabajo recuperado sin ninguna vía de guardado.
   */
  const reconciliado = useRef(false);
  useEffect(() => {
    if (reconciliado.current || cargandoLista || !recuperado?.seleccion) return;
    reconciliado.current = true;
    const sigueExistiendo = (data?.diagramas ?? []).some((d) => d.id === recuperado.seleccion);
    if (!sigueExistiendo) setSeleccion(null);
  }, [cargandoLista, data, recuperado]);

  const cabeceras = useMemo(
    () => ({ 'Content-Type': 'application/json', 'x-session-token': sessionToken ?? '' }),
    [sessionToken],
  );

  /** Lectura del mensaje del servidor: los 400 traen texto ya redactado para el alumno. */
  const leerRespuesta = useCallback(
    async (res: Response): Promise<{ diagrama?: DiagramaCompleto; message?: string }> => {
      const json: { diagrama?: DiagramaCompleto; message?: string } = await res
        .json()
        .catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'No se pudo completar la operación');
      return json;
    },
    [],
  );

  // --- Edición ---------------------------------------------------------------

  /**
   * Cambia motor o tipo y precarga la plantilla SOLO si no hay nada que perder:
   * editor vacío, o exactamente la plantilla que se precargó antes.
   *
   * En un borrador intacto también se mueve la referencia, porque de lo contrario
   * abrir el taller y probar los desplegables marcaría «cambios sin guardar»
   * sobre un diagrama que nadie ha tocado.
   */
  function cambiarPlantilla(motor: MotorDiagrama, tipo: string) {
    // Cambiar de tipo puede dejar el motor sin plantilla —solo 12 de los tipos
    // del catálogo existen en los dos—, así que se reajusta antes de nada.
    const motorValido = aMotor(motor, tipo);
    const intacto = !editor.codigo.trim() || editor.codigo === plantillaCargada.current;
    const codigo = intacto ? plantillaDiagrama(tipo, motorValido) : editor.codigo;
    if (intacto) plantillaCargada.current = codigo;

    /**
     * Cambiar el motor por debajo de un diagrama que el alumno SÍ escribió deja
     * la vista previa fallando sobre un texto que él no tocó, y sin explicación
     * el error parece suyo. No se puede evitar el cambio —el tipo elegido no
     * existe en el motor anterior—, así que se dice, y se dice cómo deshacerlo:
     * el propio selector de tipo.
     */
    setMotorCambiado(
      !intacto && motorValido !== editor.motor
        ? { de: editor.motor, a: motorValido, tipo }
        : null,
    );

    const siguiente: Estado = { ...editor, motor: motorValido, tipo, codigo };
    setEditor(siguiente);
    if (seleccion === null && intacto) setReferencia(siguiente);
  }

  function nuevoBorrador() {
    // Conserva motor y tipo actuales: quien está practicando secuencia encadena
    // varios diagramas de secuencia, no vuelve a clases en cada uno.
    const codigo = plantillaDiagrama(editor.tipo, editor.motor);
    plantillaCargada.current = codigo;
    const siguiente: Estado = { nombre: '', motor: editor.motor, tipo: editor.tipo, codigo };
    setEditor(siguiente);
    setReferencia(siguiente);
    setSeleccion(null);
    setError('');
    // El aviso describía un borrador que ya no está en pantalla; dejarlo diría
    // que hay trabajo sin guardar sobre algo recién empezado.
    setAvisoBorrador(false);
    // Ídem para el del motor: hablaba del código anterior, no de este.
    setMotorCambiado(null);
  }

  const abrir = useCallback(
    async (id: string) => {
      setCargandoDiagrama(true);
      setError('');
      try {
        const res = await fetch(`/api/me/diagramas-taller/${id}`, {
          headers: { 'x-session-token': sessionToken ?? '' },
        });
        const { diagrama } = await leerRespuesta(res);
        if (!diagrama) throw new Error('No se pudo abrir el diagrama');
        const siguiente = estadoDesde(diagrama);
        // Lo abierto es trabajo del alumno, nunca una plantilla intacta: se
        // olvida la anterior para que cambiar de tipo no lo sobrescriba.
        plantillaCargada.current = '';
        setEditor(siguiente);
        setReferencia(siguiente);
        setSeleccion(id);
        setAvisoBorrador(false);
        setMotorCambiado(null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setCargandoDiagrama(false);
      }
    },
    [sessionToken, leerRespuesta],
  );

  // --- Cambio de diagrama con confirmación ------------------------------------

  function pedirAbrir(id: string) {
    if (id === seleccion) return;
    if (hayCambios) {
      setPendiente({ clase: 'abrir', id });
      return;
    }
    void abrir(id);
  }

  function pedirNuevo() {
    if (hayCambios) {
      setPendiente({ clase: 'nuevo' });
      return;
    }
    nuevoBorrador();
  }

  /**
   * Renuncia al borrador restaurado y vuelve a la última versión guardada: se
   * relee del servidor si el borrador pertenecía a un diagrama existente, y se
   * empieza en limpio si era nuevo. Sin esto, la única forma de deshacerse de un
   * borrador restaurado sería borrar su contenido a mano.
   */
  function descartarBorrador() {
    setAvisoBorrador(false);
    // Se olvida DESPUÉS de que la relectura haya ido bien: si `abrir` falla —red
    // caída, sesión expirada— el editor conserva lo recuperado, y borrar antes
    // lo dejaría sin copia local y sin aviso.
    if (seleccion) void abrir(seleccion).then(() => olvidarBorrador(user?.id));
    else { nuevoBorrador(); olvidarBorrador(user?.id); }
  }

  function ejecutarPendiente() {
    const accion = pendiente;
    setPendiente(null);
    if (!accion) return;
    if (accion.clase === 'nuevo') nuevoBorrador();
    else void abrir(accion.id);
  }

  // --- Guardar ---------------------------------------------------------------

  async function guardar() {
    const nombre = editor.nombre.trim();
    if (!nombre) {
      setError('El diagrama necesita un nombre para poder guardarse.');
      campoNombre.current?.focus();
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const nuevo = seleccion === null;
      const res = await fetch(
        nuevo ? '/api/me/diagramas-taller' : `/api/me/diagramas-taller/${seleccion}`,
        {
          method: nuevo ? 'POST' : 'PUT',
          headers: cabeceras,
          body: JSON.stringify({
            nombre,
            motor: editor.motor,
            tipoDiagrama: editor.tipo,
            codigo: editor.codigo,
          }),
        },
      );
      const { diagrama } = await leerRespuesta(res);
      if (!diagrama) throw new Error('No se pudo guardar el diagrama');
      // Se adopta lo que devolvió el servidor, no lo que se envió: el nombre va
      // recortado y el tipo puede haberse normalizado, y la referencia tiene que
      // ser el estado REAL en BD o quedarían cambios pendientes fantasma.
      const siguiente = estadoDesde(diagrama);
      setEditor(siguiente);
      setReferencia(siguiente);
      setSeleccion(diagrama.id);
      setAvisoBorrador(false);
      recargarLista();
      setAviso(nuevo ? 'Diagrama creado.' : 'Cambios guardados.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  }

  // --- Renombrar y eliminar desde la lista ------------------------------------

  async function confirmarRenombrado() {
    if (!renombrando) return;
    const nombre = renombrando.valor.trim();
    if (!nombre) {
      setError('El diagrama necesita un nombre.');
      return;
    }
    const { id } = renombrando;
    setRenombrando(null);
    setError('');
    try {
      const res = await fetch(`/api/me/diagramas-taller/${id}`, {
        method: 'PUT',
        headers: cabeceras,
        body: JSON.stringify({ nombre }),
      });
      const { diagrama } = await leerRespuesta(res);
      // Si el renombrado es del diagrama abierto, el editor tiene que reflejarlo:
      // dos nombres distintos para la misma cosa en la misma pantalla.
      if (diagrama && id === seleccion) {
        setEditor((prev) => ({ ...prev, nombre: diagrama.nombre }));
        setReferencia((prev) => ({ ...prev, nombre: diagrama.nombre }));
      }
      recargarLista();
      setAviso('Diagrama renombrado.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function eliminar(id: string) {
    setConfirmandoBorrado(null);
    setError('');
    try {
      const res = await fetch(`/api/me/diagramas-taller/${id}`, {
        method: 'DELETE',
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      await leerRespuesta(res);
      recargarLista();
      // Al borrar el abierto, el editor no puede seguir apuntando a algo que ya
      // no existe: guardarlo entonces daría 404 sin explicación posible.
      if (id === seleccion) nuevoBorrador();
      setAviso('Diagrama eliminado.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // --- Portapapeles -----------------------------------------------------------

  async function copiarCodigo() {
    try {
      await navigator.clipboard.writeText(editor.codigo);
      setAviso('Código copiado al portapapeles.');
    } catch {
      // Sin permiso o sin contexto seguro: se dice, en vez de fallar en silencio.
      setError('El navegador no permitió copiar al portapapeles.');
    }
  }

  // OJO: no pasar `tooltips({ parent: document.body })`. CodeMirror crea entonces
  // un contenedor `position: relative` al final de <body> y posiciona ahí sus
  // desplegables; al abrirse, ese elemento amplía el área desplazable y aparece
  // un hueco vacío al final de la página.
  //
  // Sin extensión de lenguaje: el resaltado de CodeMirror no cubre Mermaid ni
  // PlantUML, y aplicar el de otro lenguaje colorearía mal. Mismo criterio que el
  // solver y el editor de autoría.
  const extensiones = useMemo(() => [EditorView.lineWrapping], []);

  if (noEncontrado) {
    return (
      <div className={styles.page}>
        <p className={styles.info}>El taller de diagramas no está disponible en este curso.</p>
      </div>
    );
  }

  if (cargandoLista && data === null && !errorLista) {
    return (
      <div className={styles.page}>
        <p className={styles.info}>Cargando…</p>
      </div>
    );
  }

  const ocupado = guardando || cargandoDiagrama;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.titulo}>Taller de diagramas</h1>
        <p className={styles.subtitulo}>
          Espacio de dibujo libre: aquí no hay enunciado ni evaluación. Los diagramas se guardan con
          nombre y pueden retomarse en cualquier momento.
        </p>
      </header>

      <div className={`${styles.cols} ${listaVisible ? '' : styles.colsSinLista}`}>
        {/* --- Lista de diagramas guardados --- */}
        {listaVisible && (
        <aside className={styles.listaCol} aria-label="Diagramas guardados">
          <div className={styles.listaBarra}>
            <h2 className={styles.listaTitulo}>Mis diagramas</h2>
            <button type="button" className={styles.btnNuevo} onClick={pedirNuevo} disabled={ocupado}>
              <Icon name="add" size="sm" />
              <span>Nuevo diagrama</span>
            </button>
          </div>

          {errorLista && (
            <div className={styles.errorBox}>
              No se pudo cargar la lista de diagramas.{' '}
              <button type="button" className={styles.enlaceBoton} onClick={recargarLista}>
                Reintentar
              </button>
            </div>
          )}

          {diagramas.length === 0 && !errorLista ? (
            <div className={styles.vacio}>
              <p className={styles.vacioTitulo}>Todavía no hay diagramas guardados.</p>
              <p className={styles.vacioTexto}>
                El taller sirve para practicar la notación fuera de los ejercicios: modelar un
                problema propio, probar una relación que no quedó clara en clase o preparar el
                diagrama de un proyecto. Cada diagrama se guarda con nombre y sigue disponible
                después.
              </p>
              <p className={styles.vacioTexto}>
                Con «Nuevo diagrama» el editor arranca con un esqueleto del tipo elegido, listo para
                modificarse.
              </p>
            </div>
          ) : (
            <ul className={styles.lista}>
              {diagramas.map((d) => (
                <li
                  key={d.id}
                  className={`${styles.item} ${d.id === seleccion ? styles.itemActivo : ''}`}
                >
                  {renombrando?.id === d.id ? (
                    /* Renombrado en línea, sin diálogo del navegador: el nombre
                       se edita donde se lee. */
                    <form
                      className={styles.renombrar}
                      onSubmit={(e) => {
                        e.preventDefault();
                        void confirmarRenombrado();
                      }}
                    >
                      <label className={styles.etiquetaOculta} htmlFor={`nombre-${d.id}`}>
                        Nuevo nombre del diagrama
                      </label>
                      <input
                        id={`nombre-${d.id}`}
                        className={styles.campo}
                        value={renombrando.valor}
                        maxLength={NOMBRE_MAX}
                        autoFocus
                        onChange={(e) => setRenombrando({ id: d.id, valor: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setRenombrando(null);
                        }}
                      />
                      <div className={styles.itemAcciones}>
                        <button type="submit" className={styles.btnMini}>
                          Guardar
                        </button>
                        <button
                          type="button"
                          className={styles.btnMini}
                          onClick={() => setRenombrando(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : confirmandoBorrado === d.id ? (
                    <div className={styles.confirmar}>
                      <p className={styles.confirmarTexto}>
                        Se eliminará «{d.nombre}». Esta acción no puede deshacerse.
                      </p>
                      <div className={styles.itemAcciones}>
                        <button
                          type="button"
                          className={`${styles.btnMini} ${styles.btnMiniPeligro}`}
                          onClick={() => void eliminar(d.id)}
                        >
                          Eliminar
                        </button>
                        <button
                          type="button"
                          className={styles.btnMini}
                          onClick={() => setConfirmandoBorrado(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={styles.itemAbrir}
                        onClick={() => pedirAbrir(d.id)}
                        // Doble clic para renombrar, igual que el árbol de
                        // Contenidos: el nombre se edita donde se lee y la
                        // tarjeta se queda con una sola acción visible.
                        onDoubleClick={() => setRenombrando({ id: d.id, valor: d.nombre })}
                        title="Doble clic para renombrar"
                        aria-current={d.id === seleccion ? 'true' : undefined}
                      >
                        <span className={styles.itemNombre}>{d.nombre}</span>
                        <span className={styles.itemMeta}>
                          {etiquetaTipoDiagrama(d.tipoDiagrama)} · {etiquetaMotorDiagrama(d.motor)}
                        </span>
                        <span className={styles.itemFecha}>{FECHA.format(new Date(d.updatedAt))}</span>
                      </button>
                      <div className={styles.itemAcciones}>
                        <button
                          type="button"
                          className={styles.btnIcono}
                          onClick={() => setConfirmandoBorrado(d.id)}
                          title={`Eliminar «${d.nombre}»`}
                          aria-label={`Eliminar ${d.nombre}`}
                        >
                          <Icon name="delete" size="sm" />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>
        )}

        {/* --- Editor --- */}
        <section className={styles.editorCol}>
          {/* Aviso de recuperación: lo que se ve NO es lo que hay en la BD, y
              callarlo llevaría a creer que el trabajo ya estaba guardado. */}
          {avisoBorrador && recuperado && (
            <div className={styles.confirmarDescarte} role="status">
              <p className={styles.confirmarTexto}>
                Se recuperó el trabajo sin guardar de la sesión anterior
                {fechaLegible(recuperado.guardadoEn) ? ` (${fechaLegible(recuperado.guardadoEn)})` : ''}.
                Sigue sin guardarse: usa «Guardar» para conservarlo.
              </p>
              <div className={styles.itemAcciones}>
                <button type="button" className={styles.btnMini} onClick={() => setAvisoBorrador(false)}>
                  Continuar editando
                </button>
                <button type="button" className={styles.btnMini} onClick={descartarBorrador}>
                  Descartar recuperación
                </button>
              </div>
            </div>
          )}

          {/* El motor cambió solo bajo un diagrama que el alumno sí escribió.
              Sin decirlo, la vista previa falla sobre un texto que él no tocó y
              el error parece suyo. */}
          {motorCambiado && (
            <div className={styles.confirmarDescarte} role="status">
              <p className={styles.confirmarTexto}>
                Se cambió el motor a {etiquetaMotorDiagrama(motorCambiado.a)} porque «
                {etiquetaTipoDiagrama(motorCambiado.tipo)}» no existe en{' '}
                {etiquetaMotorDiagrama(motorCambiado.de)}. Tu código sigue igual y puede que ya no se
                dibuje; para recuperarlo, vuelve a elegir un tipo de{' '}
                {etiquetaMotorDiagrama(motorCambiado.de)} en el selector de arriba.
              </p>
              <div className={styles.itemAcciones}>
                <button type="button" className={styles.btnMini} onClick={() => setMotorCambiado(null)}>
                  Entendido
                </button>
              </div>
            </div>
          )}

          {/* Confirmación de descarte: se pregunta ANTES de mover nada, porque el
              taller no guarda solo y lo escrito no se puede recuperar. */}
          {pendiente && (
            <div className={styles.confirmarDescarte} role="alertdialog" aria-label="Cambios sin guardar">
              <p className={styles.confirmarTexto}>
                El diagrama abierto tiene cambios sin guardar. Al continuar se perderán.
              </p>
              <div className={styles.itemAcciones}>
                <button type="button" className={styles.btnMini} onClick={ejecutarPendiente}>
                  Descartar y continuar
                </button>
                <button type="button" className={styles.btnMini} onClick={() => setPendiente(null)}>
                  Seguir editando
                </button>
              </div>
            </div>
          )}

          <div className={styles.barra}>
            {/* Equivalente al de los solvers, con las palabras de aquí: lo que
                se pliega es la lista de diagramas, no un enunciado. */}
            <button
              type="button"
              className={styles.btnLista}
              onClick={() => setListaVisible(!listaVisible)}
              aria-pressed={!listaVisible}
              title={listaVisible ? 'Ocultar la lista de diagramas' : 'Mostrar la lista de diagramas'}
            >
              <Icon name={listaVisible ? 'chevron_left' : 'chevron_right'} size="sm" />
              <span>{listaVisible ? 'Ocultar lista' : 'Mostrar lista'}</span>
            </button>

            <div className={styles.campos}>
              <label className={styles.campoGrupo}>
                <span className={styles.campoLabel}>Nombre</span>
                <input
                  ref={campoNombre}
                  className={styles.campo}
                  value={editor.nombre}
                  maxLength={NOMBRE_MAX}
                  placeholder="Sin nombre"
                  onChange={(e) => setEditor({ ...editor, nombre: e.target.value })}
                />
              </label>

              {/* El tipo va ANTES que el motor porque lo condiciona: elegir
                  tipo puede reducir los motores disponibles a uno solo. */}
              <label className={styles.campoGrupo}>
                <span className={styles.campoLabel}>Tipo</span>
                <select
                  className={styles.campo}
                  value={editor.tipo}
                  onChange={(e) => cambiarPlantilla(editor.motor, aTipo(e.target.value))}
                >
                  {/* Agrupado por bloque del curso y por grupo del catálogo: con
                      más de cuarenta tipos, una lista plana no se recorre. */}
                  {agrupadoDiagramas().map((g) => (
                    <optgroup key={`${g.ambito}:${g.nombre}`} label={g.nombre}>
                      {g.tipos.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <label className={styles.campoGrupo}>
                <span className={styles.campoLabel}>Motor</span>
                <select
                  className={styles.campo}
                  value={editor.motor}
                  onChange={(e) => cambiarPlantilla(aMotor(e.target.value, editor.tipo), editor.tipo)}
                  // Ofrecer un motor que no dibuja este tipo llevaría a una vista
                  // previa rota sin explicación posible.
                  disabled={motoresDeTipo(editor.tipo).length < 2}
                >
                  {motoresDeTipo(editor.tipo).map((m) => (
                    <option key={m} value={m}>
                      {etiquetaMotorDiagrama(m)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* `aria-label` en cada botón: el único contenido es la ligadura de
                Material Icons, así que sin él un lector de pantalla anuncia el
                nombre del icono («code», «vertical_split», «visibility»). */}
            <div className={styles.vistaGrupo} role="group" aria-label="Vista del área de trabajo">
              <button
                type="button"
                className={vista === 'codigo' ? styles.vistaActiva : ''}
                onClick={() => setVista('codigo')}
                title="Solo el diagrama escrito"
                aria-label="Solo el diagrama escrito"
                aria-pressed={vista === 'codigo'}
              >
                <Icon name="code" size="sm" />
              </button>
              <button
                type="button"
                className={vista === 'ambos' ? styles.vistaActiva : ''}
                onClick={() => setVista('ambos')}
                title="Escritura y vista previa"
                aria-label="Escritura y vista previa"
                aria-pressed={vista === 'ambos'}
              >
                <Icon name="vertical_split" size="sm" />
              </button>
              <button
                type="button"
                className={vista === 'preview' ? styles.vistaActiva : ''}
                onClick={() => setVista('preview')}
                title="Solo la vista previa"
                aria-label="Solo la vista previa"
                aria-pressed={vista === 'preview'}
              >
                <Icon name="visibility" size="sm" />
              </button>
            </div>
          </div>

          {/* Los dos paneles se OCULTAN con CSS en vez de desmontarse: al desmontar
              CodeMirror se perderían el cursor, la selección y el historial de
              deshacer cada vez que se cambia de vista. */}
          <div className={`${styles.split} ${vista === 'ambos' ? '' : styles.splitSolo}`}>
            <div className={`${styles.panel} ${vista === 'preview' ? styles.oculto : ''}`}>
              <span className={styles.panelLabel}>Diagrama</span>
              <CodeMirror
                value={editor.codigo}
                height={`${alturaPaneles}px`}
                theme={oneDark}
                extensions={extensiones}
                onChange={(codigo) => setEditor((prev) => ({ ...prev, codigo }))}
                editable={!ocupado}
              />
            </div>
            <div className={`${styles.panel} ${vista === 'codigo' ? styles.oculto : ''}`}>
              <span className={styles.panelLabel}>Vista previa</span>
              {/* Repinta con retardo y, si el código no compila, conserva el
                  último dibujo válido y muestra debajo el mensaje del motor. */}
              <VistaPreviaDiagrama
                codigo={editor.codigo}
                motor={editor.motor}
                altura={alturaPaneles}
              />
            </div>
          </div>

          <div className={styles.acciones}>
            <button className={styles.btnPri} onClick={() => void guardar()} disabled={ocupado}>
              {guardando ? 'Guardando…' : seleccion === null ? 'Guardar diagrama' : 'Guardar cambios'}
            </button>
            <button className={styles.btnSec} onClick={() => void copiarCodigo()} disabled={!editor.codigo}>
              <Icon name="content_copy" size="sm" />
              <span>Copiar código</span>
            </button>
            {/* El indicador va junto al botón que lo resuelve, no en la cabecera:
                es ahí donde se mira antes de cambiar de diagrama. */}
            <span className={hayCambios ? styles.marcaSinGuardar : styles.marcaGuardado} role="status">
              {hayCambios ? 'Cambios sin guardar' : seleccion === null ? 'Borrador nuevo' : 'Todo guardado'}
            </span>
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}
          {aviso && (
            <p className={styles.aviso} role="status">
              {aviso}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
