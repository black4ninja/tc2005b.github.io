import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { useAuth } from '../../context/AuthContext';
import { useCargaGated } from '../../hooks/useCargaGated';
import {
  MOTORES_DIAGRAMA,
  TIPOS_DIAGRAMA,
  etiquetaMotorDiagrama,
  etiquetaTipoDiagrama,
} from '../../lib/diagramas/etiquetas';
import type { MotorDiagrama, TipoDiagrama } from '../../types/contenidos';
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

/** Lo que el editor tiene en pantalla, sin identificador: vale para un borrador. */
interface Estado {
  nombre: string;
  motor: MotorDiagrama;
  tipo: TipoDiagrama;
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
 * Esqueleto mínimo de cada tipo en cada motor.
 *
 * Existen porque la barrera del diagrama-como-código no es el modelado sino la
 * primera línea: quien no recuerda si la palabra es `classDiagram` o `class` se
 * queda ante un editor vacío. Son deliberadamente CORTOS —dos o tres elementos y
 * una relación— para que se lean de un vistazo y se borren sin esfuerzo; no son
 * ejemplos que enseñen el tipo, sino un punto de partida sintáctico.
 *
 * Mermaid no tiene diagramas de casos de uso, de componentes ni de paquetes. Ahí
 * la plantilla usa `flowchart` con subgrafos, que es la aproximación habitual, y
 * PlantUML —que sí los tiene nativos— queda como la opción correcta para esos
 * tres tipos.
 */
const PLANTILLAS: Record<MotorDiagrama, Record<TipoDiagrama, string>> = {
  mermaid: {
    clases: `classDiagram
    class Cliente {
        +String nombre
        +String correo
        +registrar() void
    }
    class Pedido {
        +Date fecha
        +total() float
    }
    Cliente "1" --> "*" Pedido : realiza
`,
    secuencia: `sequenceDiagram
    actor Cliente
    participant Tienda
    participant Almacen
    Cliente->>Tienda: solicitarPedido()
    Tienda->>Almacen: reservarExistencias()
    Almacen-->>Tienda: reservaConfirmada
    Tienda-->>Cliente: pedidoRegistrado
`,
    estados: `stateDiagram-v2
    [*] --> Pendiente
    Pendiente --> Pagado : registrarPago
    Pagado --> Enviado : despachar
    Enviado --> [*]
`,
    er: `erDiagram
    CLIENTE ||--o{ PEDIDO : realiza
    PEDIDO ||--|{ LINEA_PEDIDO : contiene
    CLIENTE {
        int id PK
        string nombre
    }
    PEDIDO {
        int id PK
        date fecha
    }
    LINEA_PEDIDO {
        int id PK
        int cantidad
    }
`,
    flujo: `flowchart TD
    inicio([Inicio]) --> validar{"¿Datos completos?"}
    validar -- No --> avisar["Mostrar error"]
    validar -- Si --> registrar["Registrar solicitud"]
    registrar --> fin([Fin])
    avisar --> fin
`,
    'casos-de-uso': `flowchart LR
    cliente["Cliente"]
    subgraph tienda["Tienda en linea"]
        uc1(("Consultar catalogo"))
        uc2(("Realizar pedido"))
    end
    cliente --- uc1
    cliente --- uc2
`,
    componentes: `flowchart LR
    subgraph navegador["Navegador"]
        ui["Interfaz web"]
    end
    subgraph servidor["Servidor"]
        api["Servicio de pedidos"]
        bd[("Base de datos")]
    end
    ui --> api
    api --> bd
`,
    paquetes: `flowchart TD
    subgraph presentacion["presentacion"]
        p1["PantallaPedido"]
    end
    subgraph dominio["dominio"]
        d1["Pedido"]
    end
    subgraph persistencia["persistencia"]
        r1["RepositorioPedido"]
    end
    presentacion --> dominio
    dominio --> persistencia
`,
  },
  plantuml: {
    clases: `@startuml
class Cliente {
  +nombre : String
  +correo : String
  +registrar() : void
}
class Pedido {
  +fecha : Date
  +total() : float
}
Cliente "1" --> "*" Pedido : realiza
@enduml
`,
    secuencia: `@startuml
actor Cliente
participant Tienda
participant Almacen
Cliente -> Tienda : solicitarPedido()
Tienda -> Almacen : reservarExistencias()
Almacen --> Tienda : reservaConfirmada
Tienda --> Cliente : pedidoRegistrado
@enduml
`,
    estados: `@startuml
[*] --> Pendiente
Pendiente --> Pagado : registrarPago
Pagado --> Enviado : despachar
Enviado --> [*]
@enduml
`,
    er: `@startuml
hide circle
entity Cliente {
  * id : int
  --
  nombre : varchar
}
entity Pedido {
  * id : int
  --
  fecha : date
}
Cliente ||--o{ Pedido
@enduml
`,
    flujo: `@startuml
start
:Recibir solicitud;
if (Datos completos?) then (si)
  :Registrar solicitud;
else (no)
  :Mostrar error;
endif
stop
@enduml
`,
    'casos-de-uso': `@startuml
left to right direction
actor Cliente
rectangle Tienda {
  usecase "Consultar catalogo" as UC1
  usecase "Realizar pedido" as UC2
}
Cliente --> UC1
Cliente --> UC2
@enduml
`,
    componentes: `@startuml
component "Interfaz web" as Web
component "Servicio de pedidos" as Servicio
database "Base de datos" as BD
Web --> Servicio
Servicio --> BD
@enduml
`,
    paquetes: `@startuml
package presentacion {
  class PantallaPedido
}
package dominio {
  class Pedido
}
package persistencia {
  class RepositorioPedido
}
presentacion ..> dominio
dominio ..> persistencia
@enduml
`,
  },
};

const MOTOR_POR_OMISION: MotorDiagrama = 'mermaid';
const TIPO_POR_OMISION: TipoDiagrama = 'clases';

const BORRADOR_INICIAL: Estado = {
  nombre: '',
  motor: MOTOR_POR_OMISION,
  tipo: TIPO_POR_OMISION,
  codigo: PLANTILLAS[MOTOR_POR_OMISION][TIPO_POR_OMISION],
};

// --- Normalización de lo que llega del API ----------------------------------

const CLAVES_MOTOR: string[] = MOTORES_DIAGRAMA.map((m) => m.key);
const CLAVES_TIPO: string[] = TIPOS_DIAGRAMA.map((t) => t.key);

/**
 * El API sirve `motor` y `tipoDiagrama` como cadenas. Se acotan a la unión antes
 * de tocar el estado para que un valor desconocido —un despliegue más nuevo del
 * servidor— caiga en el valor por omisión en vez de dejar los `select` sin
 * ninguna opción seleccionada.
 */
function aMotor(valor: string): MotorDiagrama {
  return CLAVES_MOTOR.includes(valor) ? (valor as MotorDiagrama) : MOTOR_POR_OMISION;
}

function aTipo(valor: string): TipoDiagrama {
  return CLAVES_TIPO.includes(valor) ? (valor as TipoDiagrama) : TIPO_POR_OMISION;
}

function estadoDesde(d: DiagramaCompleto): Estado {
  return {
    nombre: d.nombre,
    motor: aMotor(d.motor),
    tipo: aTipo(d.tipoDiagrama),
    codigo: d.codigo,
  };
}

/** Comparación campo a campo: decide si hay cambios sin guardar. */
function mismoEstado(a: Estado, b: Estado): boolean {
  return a.nombre === b.nombre && a.motor === b.motor && a.tipo === b.tipo && a.codigo === b.codigo;
}

const FECHA = new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' });

export default function TallerDiagramasPage() {
  const { sessionToken } = useAuth();

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

  // `null` significa borrador: hay algo en el editor que todavía no existe en BD.
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [editor, setEditor] = useState<Estado>(BORRADOR_INICIAL);
  /** Lo último guardado o cargado: contra esto se mide si hay cambios. */
  const [referencia, setReferencia] = useState<Estado>(BORRADOR_INICIAL);

  /**
   * Texto EXACTO de la última plantilla precargada.
   *
   * Sirve para distinguir «el editor trae una plantilla intacta» de «el alumno
   * escribió esto». Sin esa distinción habría que elegir entre dos comportamientos
   * malos al cambiar de tipo: pisar lo escrito, o dejar en pantalla la plantilla
   * de un tipo que ya no es el seleccionado.
   */
  const plantillaCargada = useRef<string>(BORRADOR_INICIAL.codigo);

  const [vista, setVistaState] = useState<Vista>(leerVista);
  const [cargandoDiagrama, setCargandoDiagrama] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
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
   * Recarga o cierre de pestaña con trabajo sin guardar. El taller no guarda
   * solo, así que sin esto un F5 se lleva el diagrama entero sin preguntar.
   */
  useEffect(() => {
    if (!hayCambios) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [hayCambios]);

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
  function cambiarPlantilla(motor: MotorDiagrama, tipo: TipoDiagrama) {
    const intacto = !editor.codigo.trim() || editor.codigo === plantillaCargada.current;
    const codigo = intacto ? PLANTILLAS[motor][tipo] : editor.codigo;
    if (intacto) plantillaCargada.current = codigo;

    const siguiente: Estado = { ...editor, motor, tipo, codigo };
    setEditor(siguiente);
    if (seleccion === null && intacto) setReferencia(siguiente);
  }

  function nuevoBorrador() {
    // Conserva motor y tipo actuales: quien está practicando secuencia encadena
    // varios diagramas de secuencia, no vuelve a clases en cada uno.
    const codigo = PLANTILLAS[editor.motor][editor.tipo];
    plantillaCargada.current = codigo;
    const siguiente: Estado = { nombre: '', motor: editor.motor, tipo: editor.tipo, codigo };
    setEditor(siguiente);
    setReferencia(siguiente);
    setSeleccion(null);
    setError('');
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

      <div className={styles.cols}>
        {/* --- Lista de diagramas guardados --- */}
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
                          className={styles.btnMini}
                          onClick={() => setRenombrando({ id: d.id, valor: d.nombre })}
                        >
                          Renombrar
                        </button>
                        <button
                          type="button"
                          className={styles.btnMini}
                          onClick={() => setConfirmandoBorrado(d.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* --- Editor --- */}
        <section className={styles.editorCol}>
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

              <label className={styles.campoGrupo}>
                <span className={styles.campoLabel}>Motor</span>
                <select
                  className={styles.campo}
                  value={editor.motor}
                  onChange={(e) => cambiarPlantilla(aMotor(e.target.value), editor.tipo)}
                >
                  {MOTORES_DIAGRAMA.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.campoGrupo}>
                <span className={styles.campoLabel}>Tipo</span>
                <select
                  className={styles.campo}
                  value={editor.tipo}
                  onChange={(e) => cambiarPlantilla(editor.motor, aTipo(e.target.value))}
                >
                  {TIPOS_DIAGRAMA.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.vistaGrupo} role="group" aria-label="Vista del área de trabajo">
              <button
                type="button"
                className={vista === 'codigo' ? styles.vistaActiva : ''}
                onClick={() => setVista('codigo')}
                title="Solo el diagrama escrito"
                aria-pressed={vista === 'codigo'}
              >
                <Icon name="code" size="sm" />
              </button>
              <button
                type="button"
                className={vista === 'ambos' ? styles.vistaActiva : ''}
                onClick={() => setVista('ambos')}
                title="Escritura y vista previa"
                aria-pressed={vista === 'ambos'}
              >
                <Icon name="vertical_split" size="sm" />
              </button>
              <button
                type="button"
                className={vista === 'preview' ? styles.vistaActiva : ''}
                onClick={() => setVista('preview')}
                title="Solo la vista previa"
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
