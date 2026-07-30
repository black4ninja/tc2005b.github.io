import type { Renderizador } from './registro';
import { insertarSvg } from './svgSeguro';

/**
 * Motor Mermaid. Se carga bajo demanda desde el registro, así que su peso no
 * entra en el bundle inicial.
 *
 * `securityLevel: 'strict'` es importante aquí: escapa el HTML de las etiquetas
 * y desactiva los `click`, y estos diagramas los van a escribir alumnos.
 */
let iniciado: 'claro' | 'oscuro' | null = null;

async function mermaidListo(oscuro: boolean) {
  const mermaid = (await import('mermaid')).default;
  const quiere = oscuro ? 'oscuro' : 'claro';
  // `initialize` es global: solo hay que rehacerlo si cambió el tema.
  if (iniciado !== quiere) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: oscuro ? 'dark' : 'default',
      fontFamily: 'Inter, system-ui, sans-serif',
    });
    iniciado = quiere;
  }
  return mermaid;
}

let n = 0;

export const renderizador: Renderizador = {
  async pintar(codigo, contenedor, oscuro) {
    const mermaid = await mermaidListo(oscuro);
    // `parse` lanza con mensaje legible ANTES de intentar dibujar. Sin esto, un
    // typo del alumno deja a Mermaid inyectando su propio cartel de error en el
    // body, fuera de nuestro control.
    await mermaid.parse(codigo);
    const { svg } = await mermaid.render(`mmd-${++n}`, codigo);
    insertarSvg(contenedor, svg);
  },
};
