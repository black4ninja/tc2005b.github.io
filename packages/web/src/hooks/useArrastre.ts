import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';

/**
 * Arrastrar y soltar con eventos de puntero: vale para dedo, ratón y lápiz con
 * un solo camino de código.
 *
 * El arrastre nativo de HTML5 (`draggable` + `dragstart`) no existe en táctil:
 * en un iPad el tablero simplemente no se podía mover. Y no basta con escuchar
 * `touchstart`, porque el dedo hace tres cosas distintas sobre la misma
 * tarjeta —tocar para abrirla, deslizar para desplazar la columna y arrastrar
 * para moverla de sitio—, así que hay que decidir cuál es antes de robarle el
 * gesto al navegador:
 *
 *  - **Ratón**: arranca en cuanto se mueve más que la tolerancia. Con ratón no
 *    hay ambigüedad, no hay nada que desplazar arrastrando.
 *  - **Dedo**: hay que MANTENER pulsado. Si se mueve antes de que pase el
 *    retardo, era un desplazamiento y se cancela; si no se mueve, era un
 *    arrastre. Es la misma convención que usa cualquier app de tableros y la
 *    única que deja convivir las tres cosas.
 *
 * Mientras el arrastre está vivo se bloquea el desplazamiento de la página a
 * mano (`touchmove` no pasivo): `touch-action` en CSS no sirve porque el
 * navegador ya decidió qué hacer con el gesto en el `touchstart`.
 */

export interface PosicionPuntero {
  x: number;
  y: number;
}

interface Opciones<T> {
  /** Qué hacer al soltar sobre una zona. La zona es su `data-zona`. */
  alSoltar: (item: T, zona: string) => void;
  /**
   * Contenedor que se desplaza solo cuando el puntero se acerca a un borde,
   * por el eje o los ejes en los que tenga recorrido. Sin esto, en una pantalla
   * donde el contenido no cabe entero no hay forma de llevar una tarjeta de
   * «backlog» a «done», ni a alguien de las 10:30 a las 12:55: el
   * desplazamiento está bloqueado justo mientras se arrastra.
   */
  contenedor?: RefObject<HTMLElement | null>;
  /** ms de presión antes de arrancar con el dedo. */
  retardo?: number;
  /** px de movimiento que cancelan el arrastre táctil antes de tiempo. */
  tolerancia?: number;
}

/** Franja del borde donde el contenedor empieza a desplazarse solo. */
const BORDE = 72;
/**
 * Píxeles por SEGUNDO, no por fotograma.
 *
 * Antes era un paso fijo por fotograma, y eso hace dos cosas mal. Una: la
 * velocidad dependía del monitor —en una pantalla de 120 Hz el contenido corría
 * al doble que en una de 60—. Y otra: era todo o nada, así que en cuanto el
 * puntero entraba en la franja el contenido salía disparado y pasarse de sitio
 * era lo normal.
 *
 * Ahora va por tiempo y en PROPORCIÓN a lo metido que esté el puntero: al
 * asomarse se acerca despacio, y solo corre si se le pega al filo. Que es como
 * se controla a qué fila se quiere llegar.
 */
const VELOCIDAD_MIN = 60;
const VELOCIDAD_MAX = 480;

/** Cuánto desplazar en este fotograma. `dentro` va de 0 al ancho de la franja. */
function empuje(dentro: number, dt: number): number {
  const parte = Math.min(1, Math.max(0, dentro / BORDE));
  return ((VELOCIDAD_MIN + (VELOCIDAD_MAX - VELOCIDAD_MIN) * parte) * dt) / 1000;
}

export function useArrastre<T>({
  alSoltar,
  contenedor,
  retardo = 220,
  tolerancia = 8,
}: Opciones<T>) {
  const [item, setItem] = useState<T | null>(null);
  const [posicion, setPosicion] = useState<PosicionPuntero | null>(null);
  const [zona, setZona] = useState<string | null>(null);

  // Todo lo vivo del gesto va en refs: cambia en cada `pointermove` y no puede
  // provocar un repintado por sí mismo.
  const pendiente = useRef<{ item: T; x: number; y: number; tactil: boolean } | null>(null);
  const activo = useRef(false);
  const temporizador = useRef<number | null>(null);
  const cuadro = useRef<number | null>(null);
  /** Marca del fotograma anterior, para medir el desplazamiento por tiempo. */
  const anterior = useRef<number | null>(null);
  const ultima = useRef<PosicionPuntero | null>(null);

  const frenar = useCallback((e: TouchEvent) => {
    if (activo.current) e.preventDefault();
  }, []);

  /** Desplaza el contenedor y la columna bajo el dedo si está pegado a un borde. */
  const rodar = useCallback((ahora: number) => {
    cuadro.current = null;
    if (!activo.current || !ultima.current) return;
    const { x, y } = ultima.current;
    // Cuánto tiempo ha pasado desde el fotograma anterior. El primero no
    // desplaza nada: no hay contra qué medirlo. Y se pone tope por si la
    // pestaña estuvo en segundo plano, que si no vuelve dando un salto.
    const dt = anterior.current === null ? 0 : Math.min(64, ahora - anterior.current);
    anterior.current = ahora;

    // El contenedor, en los DOS ejes: el tablero de Scrum se desplaza a lo
    // ancho y la agenda de entrevistas a lo largo, y cada uno solo se mueve por
    // donde de verdad tiene recorrido.
    const caja = contenedor?.current;
    if (caja) {
      const r = caja.getBoundingClientRect();
      if (caja.scrollWidth > caja.clientWidth) {
        if (x < r.left + BORDE) caja.scrollLeft -= empuje(r.left + BORDE - x, dt);
        else if (x > r.right - BORDE) caja.scrollLeft += empuje(x - (r.right - BORDE), dt);
      }
      if (caja.scrollHeight > caja.clientHeight) {
        if (y < r.top + BORDE) caja.scrollTop -= empuje(r.top + BORDE - y, dt);
        else if (y > r.bottom - BORDE) caja.scrollTop += empuje(y - (r.bottom - BORDE), dt);
      }
    }

    // La página también, y siempre: mientras se arrastra el desplazamiento con
    // el dedo está bloqueado, así que sin esto no hay forma de llegar a lo que
    // queda fuera de la pantalla.
    if (y < BORDE) window.scrollBy(0, -empuje(BORDE - y, dt));
    else if (y > window.innerHeight - BORDE) {
      window.scrollBy(0, empuje(y - (window.innerHeight - BORDE), dt));
    }

    const zonaEl = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>('[data-zona]');
    if (zonaEl && zonaEl.scrollHeight > zonaEl.clientHeight) {
      const r = zonaEl.getBoundingClientRect();
      if (y < r.top + BORDE) zonaEl.scrollTop -= empuje(r.top + BORDE - y, dt);
      else if (y > r.bottom - BORDE) zonaEl.scrollTop += empuje(y - (r.bottom - BORDE), dt);
    }

    // Y se relee qué hay debajo, porque acaba de moverse. Mientras el contenido
    // se desplaza solo el puntero está quieto y no llega ningún `pointermove`:
    // sin esto, la zona señalada se quedaba congelada en la que estaba al
    // empezar a desplazarse y lo resaltado dejaba de ser lo que se iba a soltar.
    setZona((previa) => {
      const ahoraZona = zonaEl?.dataset.zona ?? null;
      return ahoraZona === previa ? previa : ahoraZona;
    });

    cuadro.current = requestAnimationFrame(rodar);
  }, [contenedor]);

  const terminar = useCallback(() => {
    if (temporizador.current !== null) {
      clearTimeout(temporizador.current);
      temporizador.current = null;
    }
    if (cuadro.current !== null) {
      cancelAnimationFrame(cuadro.current);
      cuadro.current = null;
    }
    pendiente.current = null;
    activo.current = false;
    ultima.current = null;
    anterior.current = null;
    setItem(null);
    setPosicion(null);
    setZona(null);
  }, []);

  const arrancar = useCallback(() => {
    const p = pendiente.current;
    if (!p || activo.current) return;
    activo.current = true;
    setItem(p.item);
    setPosicion({ x: p.x, y: p.y });
    ultima.current = { x: p.x, y: p.y };
    anterior.current = null;
    cuadro.current = requestAnimationFrame(rodar);
  }, [rodar]);

  useEffect(() => {
    function alMover(e: PointerEvent) {
      const p = pendiente.current;
      if (!p) return;

      if (!activo.current) {
        const lejos = Math.hypot(e.clientX - p.x, e.clientY - p.y) > tolerancia;
        if (!lejos) return;
        // Con el dedo, moverse antes del retardo era un desplazamiento: se
        // deja en paz y el navegador hace lo suyo.
        if (p.tactil) terminar();
        else arrancar();
        if (!activo.current) return;
      }

      ultima.current = { x: e.clientX, y: e.clientY };
      setPosicion({ x: e.clientX, y: e.clientY });
      const destino = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>('[data-zona]');
      setZona(destino?.dataset.zona ?? null);
    }

    function alSoltarPuntero() {
      const p = pendiente.current;
      if (p && activo.current) {
        // Se lee el estado a través del propio nodo: `zona` de este efecto
        // sería el de la última renderización, no el de ahora.
        const bajo = ultima.current
          ? document
            .elementFromPoint(ultima.current.x, ultima.current.y)
            ?.closest<HTMLElement>('[data-zona]')?.dataset.zona
          : undefined;
        if (bajo) alSoltar(p.item, bajo);
        // El navegador emite un `click` después de soltar: sin esto, arrastrar
        // una tarjeta terminaba abriéndola. Se retira sola enseguida — con
        // `once` se quedaría esperando y acabaría comiéndose un clic ajeno si
        // el arrastre no terminó sobre ninguna zona.
        const tragar = (ev: MouseEvent) => ev.stopPropagation();
        document.addEventListener('click', tragar, { capture: true });
        window.setTimeout(() => {
          document.removeEventListener('click', tragar, { capture: true });
        }, 50);
      }
      terminar();
    }

    window.addEventListener('pointermove', alMover);
    window.addEventListener('pointerup', alSoltarPuntero);
    window.addEventListener('pointercancel', terminar);
    window.addEventListener('touchmove', frenar, { passive: false });
    return () => {
      window.removeEventListener('pointermove', alMover);
      window.removeEventListener('pointerup', alSoltarPuntero);
      window.removeEventListener('pointercancel', terminar);
      window.removeEventListener('touchmove', frenar);
    };
  }, [alSoltar, arrancar, terminar, frenar, tolerancia]);

  useEffect(() => () => terminar(), [terminar]);

  /** Se cuelga del elemento arrastrable: `onPointerDown={iniciar(historia)}`. */
  const iniciar = useCallback(
    (valor: T) => (e: ReactPointerEvent<HTMLElement>) => {
      // Solo el botón principal, y nunca sobre un control de dentro.
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) return;

      const tactil = e.pointerType !== 'mouse';
      pendiente.current = { item: valor, x: e.clientX, y: e.clientY, tactil };
      if (tactil) {
        temporizador.current = window.setTimeout(arrancar, retardo);
      }
    },
    [arrancar, retardo],
  );

  return { iniciar, arrastrando: item, posicion, zona, activo: item !== null };
}
