/**
 * `@plantuml/core` no publica tipos (es un build de TeaVM). Declaramos solo lo
 * que usamos, con la firma del README: el diagrama entra como ARRAY DE LÍNEAS y
 * el resultado llega por callback.
 */
declare module '@plantuml/core' {
  export function render(
    lineas: string[],
    idDestino: string,
    opciones?: { dark?: boolean },
  ): void;
  export function renderToString(
    lineas: string[],
    onOk: (svg: string) => void,
    onError: (e: unknown) => void,
    opciones?: { dark?: boolean },
  ): void;
}
