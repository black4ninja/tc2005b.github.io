import { useCallback, useEffect, useState } from 'react';
import { cargarMotor, motorDe } from './registro';

/**
 * Sustituye por diagramas los bloques de código que lo sean, dentro del
 * contenedor al que se ate la ref que devuelve.
 *
 * El contenido de ese contenedor NO es nuestro: entra por
 * `dangerouslySetInnerHTML` y lo enriquecemos a mano después del render. Eso
 * obliga a defenderse de dos cosas, y ambas se dieron en la práctica:
 *
 *  - **React vuelve a montar el contenedor** (cambia la forma del árbol
 *    alrededor). Por eso se devuelve una **ref de callback** y no se acepta una
 *    `RefObject`: con la ref de callback el nodo es ESTADO, así que un nodo
 *    nuevo relanza el efecto. Con una `RefObject`, `ref.current` cambia sin
 *    avisar y el efecto no se entera.
 *  - **React reescribe el contenido del MISMO nodo** (pasaba al cambiar de
 *    lenguaje en el solver), llevándose por delante el SVG ya insertado. Para
 *    eso está el `MutationObserver`: repinta cuando el contenido cambia, venga
 *    de donde venga.
 *
 * Sin ninguna de las dos, el diagrama se dibujaba —y desaparecía sin dejar
 * rastro, sin error y sin volver nunca.
 *
 * Es idempotente: marca cada `<pre>` procesado, así que re-ejecutarlo no
 * redibuja lo que ya está.
 *
 * **Si el render falla NO se borra el bloque**: se deja el código fuente visible
 * con el error encima. Un alumno con un typo tiene que ver su código, no un
 * hueco donde debería haber un diagrama.
 */
export function useDiagramas(
  deps: unknown[],
  oscuro = false,
): (nodo: HTMLElement | null) => void {
  const [raiz, setRaiz] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!raiz) return;
    // Al cambiar de página o de tema, este efecto se relanza; lo que quedara a
    // medias de la pasada anterior no debe escribir sobre el DOM nuevo.
    let vigente = true;
    // Distingue nuestras propias mutaciones de las ajenas, para no reaccionar a
    // lo que acabamos de hacer nosotros.
    let propio = false;

    const procesar = () => {
      if (!vigente) return;
      propio = true;
      // Se libera en microtarea: las mutaciones que provocamos aquí llegan al
      // observador después de esta vuelta del bucle de eventos.
      queueMicrotask(() => { propio = false; });

      raiz.querySelectorAll('pre').forEach((pre) => {
        if (pre.dataset.diagrama) return; // ya procesado
        const code = pre.querySelector('code');
        if (!code) return;

        const codigo = (code.textContent ?? '').trim();
        if (!codigo) return;

        const clase = [...code.classList].find((c) => c.startsWith('language-'));
        const lenguaje = clase ? clase.slice('language-'.length) : null;
        const motor = motorDe(lenguaje, codigo);
        if (!motor) return;

        pre.dataset.diagrama = motor;

        const figura = document.createElement('figure');
        figura.className = 'contenido-diagrama';
        figura.dataset.motor = motor;
        const destino = document.createElement('div');
        figura.appendChild(destino);
        pre.after(figura);
        pre.style.display = 'none';

        cargarMotor(motor)
          .then((r) => r.pintar(codigo, destino, oscuro))
          .then(() => {
            if (!vigente) return;
            // El <pre> se queda OCULTO, no se borra: es la única copia del
            // código fuente que tenemos. Al cambiar de tema hay que volver a
            // dibujar el SVG con la otra paleta, y para eso el bloque original
            // tiene que seguir en el DOM (ver la limpieza del efecto). Ocultarlo
            // es indistinguible de borrarlo para quien mira la página.
          })
          .catch((e: unknown) => {
            if (!vigente) return;
            // Devuelve el código fuente y explica por qué, en vez de dejar un hueco.
            figura.remove();
            pre.style.display = '';
            delete pre.dataset.diagrama;
            const aviso = document.createElement('p');
            aviso.className = 'contenido-diagrama-error';
            aviso.textContent = `No se pudo dibujar el diagrama (${motor}): ${
              e instanceof Error ? e.message : String(e)
            }`;
            pre.before(aviso);
          });
      });
    };

    // El contenido de este contenedor NO lo controlamos: entra por
    // `dangerouslySetInnerHTML` y React puede reescribirlo entero en cualquier
    // re-render —cambiar de lenguaje en el solver lo hacía— borrando el SVG que
    // habíamos insertado. Sin observarlo, el diagrama desaparecía y no volvía
    // nunca, porque el efecto no tenía forma de enterarse.
    //
    // Reaccionar a la mutación cubre eso y cualquier otra causa futura, sin
    // depender de adivinar quién reescribe ni cuándo. Volver a procesar es
    // barato e idempotente: lo ya dibujado lleva su marca y se salta.
    const observador = new MutationObserver(() => {
      if (propio) return;
      procesar();
    });
    observador.observe(raiz, { childList: true });

    procesar();

    return () => {
      vigente = false;
      observador.disconnect();
      // Deshace lo dibujado y devuelve los <pre> a la vista. Es lo que permite
      // que un cambio de TEMA repinte: `oscuro` está en las dependencias, así
      // que el efecto se relanza, y sin esta limpieza la pasada siguiente no
      // encontraría ningún bloque que procesar (ya llevan su marca) y el SVG
      // se quedaría con la paleta anterior.
      raiz.querySelectorAll('figure.contenido-diagrama').forEach((f) => f.remove());
      raiz.querySelectorAll('p.contenido-diagrama-error').forEach((p) => p.remove());
      raiz.querySelectorAll<HTMLElement>('pre[data-diagrama]').forEach((pre) => {
        pre.style.display = '';
        delete pre.dataset.diagrama;
      });
    };
    // `deps` lo controla quien llama: normalmente la página o el markdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raiz, oscuro, ...deps]);

  return useCallback((nodo: HTMLElement | null) => setRaiz(nodo), []);
}
