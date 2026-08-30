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
   * Contenedor que se desplaza solo cuando el puntero se acerca a un borde.
   * Sin esto, en una pantalla donde el tablero no cabe entero no hay forma de
   * llevar una tarjeta de «backlog» a «done»: el desplazamiento está bloqueado
   * justo mientras se arrastra.
   */
  contenedor?: RefObject<HTMLElement | null>;
  /** ms de presión antes de arrancar con el dedo. */
  retardo?: number;
  /** px de movimiento que cancelan el arrastre táctil antes de tiempo. */
  tolerancia?: number;
}

/** Franja del borde donde el contenedor empieza a desplazarse solo. */
const BORDE = 64;
/** px por fotograma. Un valor mayor se pasa de largo y marea. */
const PASO = 12;

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
  const ultima = useRef<PosicionPuntero | null>(null);

  const frenar = useCallback((e: TouchEvent) => {
    if (activo.current) e.preventDefault();
  }, []);

  /** Desplaza el contenedor y la columna bajo el dedo si está pegado a un borde. */
  const rodar = useCallback(() => {
    cuadro.current = null;
    if (!activo.current || !ultima.current) return;
    const { x, y } = ultima.current;

    const caja = contenedor?.current;
    if (caja) {
      const r = caja.getBoundingClientRect();
      if (x < r.left + BORDE) caja.scrollLeft -= PASO;
      else if (x > r.right - BORDE) caja.scrollLeft += PASO;
    }

    // La página también, y siempre: mientras se arrastra el desplazamiento con
    // el dedo está bloqueado, así que sin esto no hay forma de llegar a lo que
    // queda fuera de la pantalla.
    if (y < BORDE) window.scrollBy(0, -PASO);
    else if (y > window.innerHeight - BORDE) window.scrollBy(0, PASO);

    const zonaEl = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>('[data-zona]');
    if (zonaEl && zonaEl.scrollHeight > zonaEl.clientHeight) {
      const r = zonaEl.getBoundingClientRect();
      if (y < r.top + BORDE) zonaEl.scrollTop -= PASO;
      else if (y > r.bottom - BORDE) zonaEl.scrollTop += PASO;
    }

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
