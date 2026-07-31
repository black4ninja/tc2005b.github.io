import { useCallback, useEffect, useState } from 'react';
import { cargarMotor, motorDe } from './registro';

/**
 * Sustituye por diagramas los bloques de código que lo sean, dentro del
 * contenedor al que se ate la ref que devuelve.
 *
 * Devuelve una **ref de callback**, no acepta una `RefObject`, y eso es lo
 * importante: el HTML entra por `dangerouslySetInnerHTML`, así que enriquecemos
 * el DOM a mano después del render. Si React vuelve a montar ese contenedor
 * —cosa que hace cuando cambia la forma del árbol alrededor— recrea el nodo con
 * el HTML original y se lleva por delante el SVG que habíamos insertado. Con una
 * `RefObject` eso es invisible: `ref.current` cambia sin avisar y el efecto no
 * se relanza, porque sus dependencias son las mismas. El diagrama se dibujaba y
 * desaparecía sin dejar rastro.
 *
 * Con la ref de callback, el nodo es ESTADO: si React lo recrea, el efecto
 * vuelve a correr sobre el nodo nuevo.
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
          pre.remove();
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

    return () => { vigente = false; };
    // `deps` lo controla quien llama: normalmente la página o el markdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raiz, oscuro, ...deps]);

  return useCallback((nodo: HTMLElement | null) => setRaiz(nodo), []);
}
