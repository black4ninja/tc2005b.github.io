/**
 * Cola de un solo carril: sirve las tareas de una en una, en el orden en que se
 * piden.
 *
 * Existe por el motor de PlantUML, que es UNA sola instancia con estado interno
 * compartido. El upstream lo dice sin rodeos: al renderizar varios diagramas en
 * el mismo contexto «you must serialize renders … the engine uses shared
 * internal state and will silently overwrite the previous result»
 * (`@plantuml/core/GITHUB_INTEGRATION.md`). Mermaid no lo necesita.
 *
 * Solo se nota cuando una página monta VARIOS diagramas a la vez, que es justo
 * lo que hace el editor de ejercicios de diagrama: pinta al mismo tiempo el
 * código inicial, cada comprobación, cada referencia y la trampa. Sin cola se
 * pisaban entre sí y a algunos no les llegaba nunca el callback del motor, así
 * que agotaban el tope de tiempo y salían como «PlantUML tardó demasiado en
 * responder» mientras el de al lado, con el mismo código, se dibujaba bien.
 */

/**
 * Devuelve una función que encola: cada tarea espera a que termine la anterior.
 *
 * Una tarea que falla NO atasca la cola —el turno siguiente arranca igual— y su
 * error llega intacto a quien la pidió.
 */
export function crearCarril(): <T>(tarea: () => Promise<T>) => Promise<T> {
  let turno: Promise<unknown> = Promise.resolve();
  return <T>(tarea: () => Promise<T>): Promise<T> => {
    const propio = turno.then(tarea);
    turno = propio.then(() => undefined, () => undefined);
    return propio;
  };
}
