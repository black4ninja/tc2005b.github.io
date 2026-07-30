import { useEffect } from 'react';
import type { RefObject } from 'react';
import { cargarMotor, motorDe } from './registro';

/**
 * Sustituye por diagramas los bloques de código que lo sean, dentro de `ref`.
 *
 * Mismo mecanismo que el botón de copiar del visor: el HTML entra por
 * `dangerouslySetInnerHTML`, así que se enriquece el DOM DESPUÉS del render y el
 * efecto se vuelve a disparar cuando cambia el contenido.
 *
 * Es idempotente: marca cada `<pre>` procesado, así que re-ejecutarlo no
 * redibuja lo que ya está.
 *
 * **Si el render falla NO se borra el bloque**: se deja el código fuente visible
 * con el error encima. Un alumno con un typo tiene que ver su código, no un
 * hueco donde debería haber un diagrama.
 */
export function useDiagramas(
  ref: RefObject<HTMLElement | null>,
  deps: unknown[],
  oscuro = false,
): void {
  useEffect(() => {
    const raiz = ref.current;
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
  }, [ref, oscuro, ...deps]);
}
