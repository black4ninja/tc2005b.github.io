import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useDiagramasNav, type DiagramaLista } from '../../context/DiagramasNavContext';
import { rutaTallerAdmin, rutaTallerAlumno } from '../../config/rutasDiagramas';
import {
  BLOQUES_CURSO,
  agrupadoDiagramas,
  etiquetaMotorDiagrama,
  etiquetaTipoDiagrama,
  posicionDeTipoDiagrama,
  type TipoDiagramaDef,
} from '../../lib/diagramas/etiquetas';
import { contables, indiceDeBloques } from './navegacionDiagramas';
import styles from './DiagramasAlumno.module.css';

/**
 * Listado de ejercicios de diagrama.
 *
 * La navegación —bloques del curso y grupos del catálogo— NO está aquí: la pinta
 * el sidebar (`ArbolDiagramas`), y el avance global, el topbar. Esta pantalla se
 * queda con lo que corresponde al panel principal: los tipos de la sección
 * abierta, con sus ejercicios.
 *
 * Se agrupa por TIPO DE DIAGRAMA y no por categoría, que es lo que hacía antes.
 * En este módulo son casi lo mismo —las categorías sembradas se llaman «Clases»,
 * «Secuencia»…—, pero el tipo es el que decide qué se comprueba y el que el
 * alumno reconoce, y además permite listar en la misma pantalla los tipos que
 * todavía no tienen ejercicios.
 */

interface FilaTipo {
  tipo: string;
  def?: TipoDiagramaDef;
  /** Motores que usan SUS ejercicios, sin repetir. */
  motores: string[];
  ejercicios: DiagramaLista[];
}

export default function DiagramasAlumnoPage() {
  const { id } = useParams<{ id?: string }>();
  const {
    activo,
    base,
    coleccion,
    bloques,
    categorias,
    ejercicios,
    cargando,
    error,
    reintentar,
    seccion,
    irA,
  } = useDiagramasNav();

  const [abierto, setAbierto] = useState<string | null>(null);

  const rutaTaller = id ? rutaTallerAdmin(id) : rutaTallerAlumno();

  /** Bloque de la colección al que pertenece cada ejercicio, vía su categoría. */
  const bloqueDeEjercicio = useMemo(() => indiceDeBloques(bloques, categorias), [bloques, categorias]);

  /**
   * Sección efectiva: la de la URL, o el primer bloque con ejercicios. Sin este
   * respaldo, entrar al módulo sin `?seccion=` dejaría el panel vacío junto a un
   * árbol lleno, que se lee como que no hay nada publicado.
   *
   * Se memoiza por sus DOS campos y no por el objeto: construido en cada render,
   * su identidad cambiaba siempre y las memos que dependen de él no memoizaban
   * nada.
   */
  // Por omisión se abre un bloque DEL CURSO, no el primero que llegue: si la
  // colección tuviera solo ejercicios del catálogo adicional, arrancar ahí sería
  // correcto, pero teniendo temario es lo primero que el alumno espera ver.
  const porOmision =
    bloques.find((b) => BLOQUES_CURSO.includes(b.nombre))?.nombre ?? bloques[0]?.nombre ?? null;
  const claseSeccion = seccion?.clase ?? (porOmision ? 'curso' : null);
  const nombreSeccion = seccion?.nombre ?? porOmision;
  const seccionEfectiva = useMemo(
    () => (claseSeccion && nombreSeccion ? { clase: claseSeccion, nombre: nombreSeccion } : null),
    [claseSeccion, nombreSeccion],
  );

  const esCatalogo = seccionEfectiva?.clase === 'cat';

  /** Tipos con ejercicios de la sección abierta, en el orden del catálogo. */
  const filas = useMemo<FilaTipo[]>(() => {
    if (!seccionEfectiva || esCatalogo) return [];
    const suyos = ejercicios.filter((e) => bloqueDeEjercicio(e) === seccionEfectiva.nombre);
    const porTipo = new Map<string, DiagramaLista[]>();
    for (const e of suyos) {
      porTipo.set(e.tipoDiagrama, [...(porTipo.get(e.tipoDiagrama) ?? []), e]);
    }
    const catalogo = new Map(
      agrupadoDiagramas().flatMap((g) => g.tipos.map((t) => [t.key, t] as const)),
    );
    return [...porTipo.entries()]
      .sort(([a], [b]) => posicionDeTipoDiagrama(a) - posicionDeTipoDiagrama(b) || a.localeCompare(b))
      .map(([tipo, items]) => ({
        tipo,
        def: catalogo.get(tipo),
        motores: [...new Set(items.map((e) => e.motor).filter(Boolean))],
        ejercicios: [...items].sort((x, y) => x.orden - y.orden),
      }));
  }, [ejercicios, seccionEfectiva, esCatalogo, bloqueDeEjercicio]);

  /** Tipos del grupo del catálogo abierto: sin ejercicios, solo modo libre. */
  const tiposCatalogo = useMemo<TipoDiagramaDef[]>(() => {
    if (!seccionEfectiva || !esCatalogo) return [];
    const conEjercicios = new Set(ejercicios.map((e) => e.tipoDiagrama));
    return (
      agrupadoDiagramas().find((g) => g.ambito === 'catalogo' && g.nombre === seccionEfectiva.nombre)
        ?.tipos.filter((t) => !conEjercicios.has(t.key)) ?? []
    );
  }, [seccionEfectiva, esCatalogo, ejercicios]);

  // El primer tipo se abre solo: con todos plegados, la pantalla arranca en una
  // lista de cabeceras que no enseña ningún ejercicio.
  const abiertoEfectivo = abierto ?? filas[0]?.tipo ?? null;

  if (!activo) return null;

  if (cargando && ejercicios.length === 0 && !error) {
    return <div className={styles.page}><p className={styles.info}>Cargando…</p></div>;
  }
  if (error) {
    return (
      <div className={styles.page}>
        <p className={styles.info}>
          No se pudo cargar el listado. Puede deberse a un problema de conexión.
        </p>
        <button className={`${styles.volver} ${styles.enlaceBoton}`} onClick={reintentar}>
          Reintentar
        </button>
      </div>
    );
  }

  if (ejercicios.length === 0) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.titulo}>Diagramas</h1>
          {(coleccion?.clave || coleccion?.nombre) && (
            <p className={styles.subtitulo}>{coleccion?.clave || coleccion?.nombre}</p>
          )}
        </header>
        <p className={styles.info}>Aún no hay ejercicios de diagrama publicados en esta colección.</p>
        <p className={styles.info}>
          El <Link to={rutaTaller} className={styles.enlace}>modo libre</Link> sigue disponible para
          practicar cualquier tipo del catálogo.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Sin barra de progreso: vive en el topbar, donde sigue visible mientras
          se resuelve un ejercicio. Duplicarla aquí daría dos cifras que hay que
          comparar para confiar en alguna. */}
      <header className={styles.header}>
        <h1 className={styles.titulo}>{seccionEfectiva?.nombre ?? 'Diagramas'}</h1>
        {(coleccion?.clave || coleccion?.nombre) && (
          <p className={styles.subtitulo}>{coleccion?.clave || coleccion?.nombre}</p>
        )}
      </header>

      {esCatalogo ? (
        <>
          <p className={styles.catalogoIntro}>
            Estos tipos no tienen ejercicios asignados. Se abren en modo libre con una plantilla de
            arranque, para practicar la notación sin evaluación.
          </p>
          <ul className={styles.lista}>
            {tiposCatalogo.map((t) => (
              <li key={t.key}>
                {/* El tipo viaja en la URL: la tarjeta promete abrir ESE tipo,
                    y sin el parámetro el taller arrancaba en el último usado. */}
                <Link to={`${rutaTaller}?tipo=${encodeURIComponent(t.key)}`} className={styles.tipoLibre}>
                  <span className={styles.tipoTexto}>
                    <span className={styles.tipoNombre}>{t.label}</span>
                    <span className={styles.tipoDesc}>{t.descripcion}</span>
                  </span>
                  <span className={styles.abrirLibre}>Abrir en modo libre →</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : filas.length === 0 ? (
        <p className={styles.info}>Esta sección todavía no tiene ejercicios publicados.</p>
      ) : (
        filas.map((f) => {
          const cuentan = contables(f.ejercicios);
          const resueltos = cuentan.filter((e) => e.resuelto).length;
          const estaAbierto = abiertoEfectivo === f.tipo;
          return (
            <section key={f.tipo} className={styles.grupo}>
              <button
                className={styles.grupoHeader}
                aria-expanded={estaAbierto}
                onClick={() => setAbierto(estaAbierto ? '' : f.tipo)}
              >
                <span className={styles.chevron} aria-hidden>{estaAbierto ? '▾' : '▸'}</span>
                <span className={styles.grupoTitulo}>{etiquetaTipoDiagrama(f.tipo)}</span>
                {f.def && <span className={styles.grupoDesc}>{f.def.descripcion}</span>}
                {/* El motor sale de los EJERCICIOS, no del tipo. Desde que
                    `clases` y `er` se evalúan en los dos motores, anunciar los
                    del tipo prometería una escritura que estos ejercicios
                    concretos rechazan: cada uno fija el suyo. */}
                {f.motores.map((m) => (
                  <span key={m} className={styles.motor}>{etiquetaMotorDiagrama(m)}</span>
                ))}
                <span className={styles.grupoConteo}>{resueltos}/{cuentan.length}</span>
              </button>
              {estaAbierto && (
                <ul className={styles.lista}>
                  {f.ejercicios.map((e) => (
                    <li key={e.id}>
                      <Link
                        to={`${base}/${e.slug}`}
                        className={`${styles.item} ${e.esEjemplo ? styles.itemEjemplo : e.resuelto ? styles.itemResuelto : ''}`}
                      >
                        <span className={styles.itemIzq}>
                          {/* Un ejemplo no se resuelve, se consulta: la palomita
                              de «hecho» ahí confundiría con el avance real. */}
                          <span className={styles.check} aria-hidden>
                            {e.esEjemplo ? '★' : e.resuelto ? '✓' : '○'}
                          </span>
                          <span className={styles.itemTitulo}>{e.titulo}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}

      {/* Puente al catálogo, para quien no repare en el árbol del sidebar. */}
      {!esCatalogo && (
        <button
          type="button"
          className={styles.puenteCatalogo}
          onClick={() => irA({ clase: 'cat', nombre: 'Modelado adicional' })}
        >
          <span className={styles.tipoTexto}>
            <span className={styles.tipoNombre}>¿Buscas otro tipo de diagrama?</span>
            <span className={styles.tipoDesc}>
              El catálogo tiene más tipos de PlantUML y Mermaid con plantillas listas para el modo
              libre.
            </span>
          </span>
          <span className={styles.abrirLibre}>Explorar catálogo →</span>
        </button>
      )}
    </div>
  );
}
