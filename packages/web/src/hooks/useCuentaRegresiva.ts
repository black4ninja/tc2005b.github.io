import { useEffect, useState } from 'react';
import { cuentaRegresiva } from '../utils/scrum';

/**
 * El reloj de la etapa del Scrum.
 *
 * Lo lleva el cliente: el servidor sella la hora de arranque y aquí se cuenta,
 * para que una pantalla que entra a mitad enseñe el número correcto sin
 * preguntar. El tic solo corre cuando hay algo que contar.
 *
 * Vive en un hook porque el mismo reloj se enseña en tres sitios —el tablero
 * del alumno, la pantalla que se proyecta y la barra de mandos del profesor— y
 * tres copias del mismo intervalo es la clase de duplicado que se queda atrás
 * en cuanto uno de los tres cambia.
 */
export function useCuentaRegresiva(
  iniciadaEn: string | null | undefined,
  duracionSegundos: number | null | undefined,
): { texto: string; agotado: boolean } | null {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (!iniciadaEn || !duracionSegundos) return;
    setAhora(Date.now());
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [iniciadaEn, duracionSegundos]);

  return cuentaRegresiva(iniciadaEn ?? null, duracionSegundos ?? null, ahora);
}
