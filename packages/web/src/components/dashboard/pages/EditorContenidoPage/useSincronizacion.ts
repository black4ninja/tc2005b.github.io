import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror';

/**
 * Sincronización fuente ⇄ preview del editor de contenidos.
 *
 * La pieza que lo hace posible no está aquí sino en el pipeline: con
 * `renderMarkdown(cuerpo, { lineas: true })` cada bloque del HTML sale con
 * `data-linea`, la línea del Markdown de la que procede. Eso da una tabla de
 * ANCLAS (línea ↔ altura en el preview) con la que se traduce en los dos
 * sentidos, sin adivinar por el texto.
 *
 * Entre anclas se INTERPOLA: un párrafo de diez líneas ocupa una sola ancla, y
 * sin interpolar el preview daría saltos secos al recorrerlo.
 *
 * El resaltado del bloque bajo el cursor marca los dos extremos de la misma
 * correspondencia. Además de ubicar, sirve para ver a ojo dónde el mapeo no
 * cuadra al 100 % — que es justo para lo que se mira esta vista.
 */

/** Un bloque del preview y la línea del Markdown en la que empieza. */
export interface Ancla {
  linea: number;
  /** Altura del bloque dentro del contenedor con scroll del preview. */
  top: number;
  el: HTMLElement;
}

/**
 * Línea (fraccionaria) que corresponde a una altura del preview.
 * Pura y exportada para poder probar la interpolación sin navegador.
 */
export function lineaEnTop(anclas: Ancla[], top: number): number {
  if (!anclas.length) return 1;
  let i = 0;
  while (i + 1 < anclas.length && anclas[i + 1].top <= top) i++;
  const act = anclas[i];
  const sig = anclas[i + 1];
  if (!sig) return act.linea;
  const avance = (top - act.top) / Math.max(sig.top - act.top, 1);
  return act.linea + Math.min(Math.max(avance, 0), 1) * (sig.linea - act.linea);
}

/** Altura del preview que corresponde a una línea (fraccionaria). Inversa de la anterior. */
export function topEnLinea(anclas: Ancla[], linea: number): number {
  if (!anclas.length) return 0;
  let i = 0;
  while (i + 1 < anclas.length && anclas[i + 1].linea <= linea) i++;
  const act = anclas[i];
  const sig = anclas[i + 1];
  if (!sig) return act.top;
  const avance = (linea - act.linea) / Math.max(sig.linea - act.linea, 1);
  return act.top + Math.min(Math.max(avance, 0), 1) * (sig.top - act.top);
}

/**
 * Índice del ancla que abre el bloque donde cae esa línea. `-1` si no hay
 * anclas. Un bloque llega hasta donde empieza el siguiente.
 */
export function indiceDelBloque(anclas: Ancla[], linea: number): number {
  if (!anclas.length) return -1;
  let i = 0;
  while (i + 1 < anclas.length && anclas[i + 1].linea <= linea) i++;
  return i;
}

const lineaDeBloque = Decoration.line({ class: 'cm-bloqueActivo' });

/* El tema base va aquí y no en el CSS Module porque CodeMirror inyecta sus
   estilos en un `StyleModule` propio: una regla suelta del módulo perdería
   contra `.cm-activeLine` por orden de cascada. */
const temaBloque = EditorView.baseTheme({
  '.cm-bloqueActivo': {
    backgroundColor: 'rgba(93, 135, 255, 0.16)',
    boxShadow: 'inset 2px 0 0 0 #5d87ff',
  },
});

interface Opciones {
  editorRef: React.RefObject<ReactCodeMirrorRef | null>;
  previewRef: React.RefObject<HTMLDivElement | null>;
  /** Solo con las dos columnas a la vista, en Markdown y con la sync encendida. */
  activo: boolean;
  /** Cambia en cada render del preview: obliga a volver a medir las anclas. */
  previewHtml: string;
  /** Pasa a `true` cuando CodeMirror ya montó su `EditorView`. */
  editorListo: boolean;
}

/** Ventana en la que el scroll que provocamos NO se interpreta como del usuario. */
const MS_CONDUCTOR = 180;
/** Al revelar un bloque fuera de vista, dónde se deja respecto al alto visible. */
const REVELADO = 0.25;

export function useSincronizacion({
  editorRef,
  previewRef,
  activo,
  previewHtml,
  editorListo,
}: Opciones): { extensiones: Extension[]; remedir: () => void } {
  const anclasRef = useRef<Ancla[]>([]);
  const activoRef = useRef(activo);
  activoRef.current = activo;
  /** Bloque del preview que lleva la clase ahora mismo. */
  const marcadoRef = useRef<HTMLElement | null>(null);
  /**
   * Quién manda ahora mismo. Sin esto hay ping-pong: el scroll que provocamos
   * en un panel dispara su propio evento `scroll`, que corregiría al otro, que
   * volvería a corregir a este… con deriva acumulada en cada vuelta.
   */
  const conductor = useRef<'codigo' | 'preview' | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tomarMando = useCallback((quien: 'codigo' | 'preview') => {
    conductor.current = quien;
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      conductor.current = null;
    }, MS_CONDUCTOR);
  }, []);

  /** Pinta (o despinta) el bloque en el lado del preview. */
  const marcarEnPreview = useCallback((el: HTMLElement | null) => {
    if (marcadoRef.current === el) return;
    marcadoRef.current?.classList.remove('bloqueActivo');
    marcadoRef.current = el;
    el?.classList.add('bloqueActivo');
  }, []);

  /** Trae el bloque a la vista SOLO si no se ve: si ya está, moverlo pelearía
      con la sincronización de scroll. */
  const revelar = useCallback(
    (el: HTMLElement) => {
      const cont = previewRef.current;
      if (!cont) return;
      const arriba = el.getBoundingClientRect().top - cont.getBoundingClientRect().top;
      const abajo = arriba + el.offsetHeight;
      if (arriba >= 0 && abajo <= cont.clientHeight) return;
      tomarMando('codigo');
      cont.scrollTop += arriba - cont.clientHeight * REVELADO;
    },
    [previewRef, tomarMando],
  );

  /* ── Anclas: línea del Markdown ↔ altura en el preview ── */
  const remedir = useCallback(() => {
    const cont = previewRef.current;
    if (!cont) {
      anclasRef.current = [];
      return;
    }
    const arriba = cont.getBoundingClientRect().top;
    const anclas: Ancla[] = [];
    let ultima = -1;
    for (const el of Array.from(cont.querySelectorAll<HTMLElement>('[data-linea]'))) {
      const linea = Number(el.dataset.linea);
      if (!Number.isFinite(linea)) continue;
      // Los bloques anidados repiten la línea del que los abre (un `ul` y su
      // primer `li`, una `table` y su `thead`). Nos quedamos con el primero en
      // orden de documento: es el más externo, y comparten altura.
      if (linea <= ultima) continue;
      ultima = linea;
      anclas.push({ linea, top: el.getBoundingClientRect().top - arriba + cont.scrollTop, el });
    }
    anclasRef.current = anclas;
  }, [previewRef]);

  /* ── Línea asomada por el borde superior del editor, y su inversa ── */
  const lineaArribaDelCodigo = useCallback((view: EditorView): number => {
    const caja = view.scrollDOM.getBoundingClientRect();
    const pos = view.posAtCoords({ x: caja.left + 4, y: caja.top + 1 }, false);
    const bloque = view.lineBlockAt(pos);
    const numero = view.state.doc.lineAt(bloque.from).number;
    // `documentTop` es la Y de cliente del inicio del documento y `bloque.top`
    // va en coordenadas del documento: sumarlos da la Y de cliente del bloque, y
    // la diferencia con el borde del scroller, cuánto de él queda ya por encima.
    const recorrido = caja.top - (view.documentTop + bloque.top);
    const frac = bloque.height > 0 ? recorrido / bloque.height : 0;
    return numero + Math.min(Math.max(frac, 0), 1);
  }, []);

  const llevarCodigoA = useCallback((view: EditorView, linea: number) => {
    const total = view.state.doc.lines;
    const numero = Math.min(Math.max(Math.floor(linea), 1), total);
    const frac = Math.min(Math.max(linea - numero, 0), 1);
    const bloque = view.lineBlockAt(view.state.doc.line(numero).from);
    const objetivo = view.documentTop + bloque.top + frac * bloque.height;
    view.scrollDOM.scrollTop += objetivo - view.scrollDOM.getBoundingClientRect().top;
  }, []);

  /* ── Resaltado del bloque bajo el cursor ──
     Va en un `ViewPlugin` y no en un `updateListener` que despache: CodeMirror
     prohíbe abrir transacciones desde un listener de update, y programarlas
     costaría una transacción extra por pulsación. El plugin, además, recalcula
     solo con el estado que ya tiene delante. */
  const extensiones = useMemo<Extension[]>(() => {
    const plugin = ViewPlugin.fromClass(
      class {
        decorations: DecorationSet = Decoration.none;

        constructor(view: EditorView) {
          this.recalcular(view, false);
        }

        update(u: ViewUpdate) {
          // Al mover el cursor (no al teclear) se trae el bloque a la vista:
          // teclear ya mueve el scroll por su cuenta y competir daría saltos.
          this.recalcular(u.view, u.selectionSet && !u.docChanged);
        }

        recalcular(view: EditorView, revelarBloque: boolean) {
          if (!activoRef.current) {
            this.decorations = Decoration.none;
            marcarEnPreview(null);
            return;
          }
          const anclas = anclasRef.current;
          const cursor = view.state.doc.lineAt(view.state.selection.main.head).number;
          const i = indiceDelBloque(anclas, cursor);
          if (i < 0) {
            this.decorations = Decoration.none;
            marcarEnPreview(null);
            return;
          }
          const act = anclas[i];
          const sig = anclas[i + 1];
          const total = view.state.doc.lines;
          const desde = Math.min(Math.max(act.linea, 1), total);
          const hasta = Math.min(Math.max(sig ? sig.linea - 1 : total, desde), total);

          const marcas = [];
          for (let n = desde; n <= hasta; n++) {
            marcas.push(lineaDeBloque.range(view.state.doc.line(n).from));
          }
          this.decorations = Decoration.set(marcas);

          const cambio = marcadoRef.current !== act.el;
          marcarEnPreview(act.el);
          // Fuera del ciclo de update de CodeMirror: revelar toca el scroll de
          // OTRO elemento y hacerlo aquí provocaría un reflow a media medición.
          if (revelarBloque && cambio) requestAnimationFrame(() => revelar(act.el));
        }
      },
      { decorations: (v) => v.decorations },
    );
    return [plugin, temaBloque];
  }, [marcarEnPreview, revelar]);

  /* ── Medir tras cada render del preview (y cuando cambie de tamaño) ── */
  useEffect(() => {
    if (!activo) return;
    const cont = previewRef.current;
    if (!cont) return;

    // Tras pintar: `previewHtml` acaba de entrar en el DOM y las alturas aún no
    // están calculadas en este tick.
    const raf = requestAnimationFrame(remedir);

    // Las imágenes llegan después y desplazan lo que tienen debajo; el observer
    // recoge eso y también los cambios de ancho del panel.
    const observer = new ResizeObserver(remedir);
    observer.observe(cont);
    for (const hijo of Array.from(cont.children)) observer.observe(hijo);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [activo, previewHtml, remedir, previewRef]);

  /* ── Scroll en los dos sentidos + clic para saltar ── */
  useEffect(() => {
    const view = editorRef.current?.view;
    const cont = previewRef.current;
    if (!view || !cont) return;

    if (!activo) {
      // Al apagar la sincronización (o colapsar una columna) hay que retirar el
      // resaltado: si no, se queda pintado un bloque que ya nadie sincroniza.
      marcarEnPreview(null);
      return;
    }

    const alScrollCodigo = () => {
      if (conductor.current === 'preview') return;
      tomarMando('codigo');
      cont.scrollTop = topEnLinea(anclasRef.current, lineaArribaDelCodigo(view));
    };

    const alScrollPreview = () => {
      if (conductor.current === 'codigo') return;
      tomarMando('preview');
      llevarCodigoA(view, lineaEnTop(anclasRef.current, cont.scrollTop));
    };

    /** Clic en el preview → el cursor de la fuente salta a esa línea. */
    const alClicPreview = (e: MouseEvent) => {
      const destino = (e.target as HTMLElement | null)?.closest?.('[data-linea]');
      if (!(destino instanceof HTMLElement)) return;
      const linea = Number(destino.dataset.linea);
      if (!Number.isFinite(linea)) return;
      const numero = Math.min(Math.max(linea, 1), view.state.doc.lines);
      tomarMando('preview');
      view.dispatch({ selection: { anchor: view.state.doc.line(numero).from }, scrollIntoView: false });
      llevarCodigoA(view, Math.max(numero - 1, 1)); // una línea de aire por encima
      view.focus();
    };

    view.scrollDOM.addEventListener('scroll', alScrollCodigo, { passive: true });
    cont.addEventListener('scroll', alScrollPreview, { passive: true });
    cont.addEventListener('click', alClicPreview);

    // Primer cuadre al encender: el preview se alinea con lo que ya se ve.
    remedir();
    tomarMando('codigo');
    cont.scrollTop = topEnLinea(anclasRef.current, lineaArribaDelCodigo(view));

    return () => {
      view.scrollDOM.removeEventListener('scroll', alScrollCodigo);
      cont.removeEventListener('scroll', alScrollPreview);
      cont.removeEventListener('click', alClicPreview);
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [
    activo,
    editorListo,
    editorRef,
    previewRef,
    lineaArribaDelCodigo,
    llevarCodigoA,
    marcarEnPreview,
    remedir,
    tomarMando,
  ]);

  return { extensiones, remedir };
}
