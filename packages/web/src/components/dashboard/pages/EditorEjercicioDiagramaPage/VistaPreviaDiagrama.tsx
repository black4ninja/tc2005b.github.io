import { useEffect, useRef, useState } from 'react';
import { cargarMotor } from '../../../../lib/diagramas/registro';
import { ajustarAlContenedor } from '../../../../lib/diagramas/ajustar';
import styles from './VistaPreviaDiagrama.module.css';

/**
 * Retardo antes de repintar. Dibujar en cada pulsación es caro —Mermaid parsea y
 * genera el SVG entero— y además muestra errores de sintaxis a media palabra,
 * que es ruido: mientras se escribe `classDiagram`, todo prefijo es inválido.
 */
const RETARDO_MS = 400;

interface Props {
  codigo: string;
  motor: string;
  /** Alto mínimo del lienzo, para que el editor no dé saltos al repintar. */
  altura?: number;
}

/**
 * Vista previa en vivo de un diagrama-como-código.
 *
 * Un diagrama que no compila NO rompe la página ni deja un hueco: se muestra el
 * error del motor y se conserva lo último válido fuera de la vista, porque quien
 * está escribiendo necesita saber qué falla, no perder el contexto.
 */
export default function VistaPreviaDiagrama({ codigo, motor, altura = 220 }: Props) {
  const lienzo = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState('');
  const [pintando, setPintando] = useState(false);
  const [codigoRetardado, setCodigoRetardado] = useState(codigo);

  useEffect(() => {
    const t = window.setTimeout(() => setCodigoRetardado(codigo), RETARDO_MS);
    return () => window.clearTimeout(t);
  }, [codigo]);

  useEffect(() => {
    const fuente = codigoRetardado.trim();

    // El caso «sin código» se resuelve ANTES de mirar la ref, y no después.
    // Cuando el editor se vacía, este componente deja de pintar el <div> del
    // lienzo, React pone la ref a `null` y un `return` temprano por ref nula
    // saltaba por encima de esta limpieza: en pantalla quedaba «Sin código que
    // dibujar» junto al error del código anterior, que ya no existe.
    if (!fuente) {
      // Normalmente la ref ya es nula, pero si el lienzo sigue montado hay que
      // borrar el dibujo anterior: no puede quedar un diagrama sin código.
      lienzo.current?.replaceChildren();
      setError('');
      return;
    }

    const destino = lienzo.current;
    if (!destino) return;

    let vigente = true;
    setPintando(true);
    // Se pinta sobre un nodo SUELTO y se adopta al final: si mientras tanto
    // llegó código más nuevo, este render se descarta sin haber tocado nunca lo
    // que el autor ve. Sin esto, dos renders solapados se pisan y el lienzo
    // acaba mostrando el diagrama viejo.
    const provisional = document.createElement('div');

    cargarMotor(motor)
      .then((r) => r.pintar(fuente, provisional, false))
      .then(() => {
        if (!vigente) return;
        destino.replaceChildren(...Array.from(provisional.childNodes));
        // Los motores dejan el SVG a su tamaño intrínseco: sin esto, un
        // diagrama de dos clases se queda diminuto en un panel ancho.
        const svg = destino.querySelector('svg');
        if (svg) ajustarAlContenedor(svg, altura);
        setError('');
      })
      .catch((e: unknown) => {
        if (!vigente) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (vigente) setPintando(false);
      });

    return () => { vigente = false; };
  }, [codigoRetardado, motor, altura]);

  const vacio = !codigoRetardado.trim();

  return (
    <div className={styles.marco}>
      {vacio ? (
        <p className={styles.vacio} style={{ minHeight: `${altura}px` }}>Sin código que dibujar.</p>
      ) : (
        <div
          className={`${styles.lienzo} ${pintando ? styles.ocupado : ''}`}
          style={{ minHeight: `${altura}px` }}
          ref={lienzo}
          aria-live="polite"
        />
      )}
      {error && (
        <p className={styles.error} role="status">
          No se pudo dibujar el diagrama: {error}
        </p>
      )}
    </div>
  );
}
