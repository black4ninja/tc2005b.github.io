import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../../atoms/Modal/Modal';
import Icon from '../../atoms/Icon/Icon';
import DashButton from '../../atoms/DashButton/DashButton';
import SelectorDias from '../SelectorDias/SelectorDias';
import {
  expandirFechas, fechaCorta, hora, type BloqueFechas,
} from '../../../../utils/agenda';
import styles from './AbrirDiasModal.module.css';

/** Una fila del plan que devuelve el servidor. */
export interface FilaPlan {
  inicio: string;
  fin: string;
  estado: 'nuevo' | 'duplicado' | 'solapa';
  choca: { inicio: string; fin: string } | null;
}

interface Props {
  /** Cuánto dura cada entrevista, para poder decir cuántos huecos salen. */
  duracionSegundos: number;
  guardando: boolean;
  /** Pide la simulación al servidor. Null si todavía no hay nada que pedir. */
  onSimular: (bloques: { inicio: string; fin: string }[]) => Promise<FilaPlan[] | null>;
  onAbrir: (bloques: { inicio: string; fin: string }[], nota: string) => void;
  onCerrar: () => void;
}

/** Un horario recién puesto. `id` solo vive en la pantalla; el servidor no lo ve. */
let siguienteId = 0;
function nuevoBloque(): BloqueFechas & { id: number } {
  siguienteId += 1;
  return { id: siguienteId, fechas: [], desde: '09:00', hasta: '13:00' };
}

/** Cuánto se espera antes de pedir la vista previa, para no ir por tecla. */
const ESPERA_MS = 350;

/**
 * Abrir días de entrevistas en lote.
 *
 * Antes esto era un día y una franja por vez: montar un mes de entrevistas
 * significaba abrir el modal treinta veces. Y el primer intento de arreglarlo
 * fue un rango de fechas cruzado con los días de la semana —«del 7 al 18,
 * martes y jueves»—, que obliga a traducir las fechas que uno tiene en la
 * cabeza a una regla que las produzca, y no sabe decir «el 7, el 8 y el 15».
 *
 * Aquí se pican los días en un calendario y se les pone su horario. Y se pueden
 * añadir tantos horarios como haga falta, cada uno con sus propios días: «el 7,
 * 8 y 9 de 9 a 11» y, además, «el 10 y el 11 de 4 a 6».
 *
 * La vista previa no es un adorno: dice exactamente qué se va a crear antes de
 * pulsar y marca lo que se salta. Sin ella «abrir 7 bloques» es un botón a
 * ciegas, y un horario que se pisa con otro parte las mismas horas dos veces
 * —el hueco de las 10:00 acaba existiendo por duplicado y dos alumnos lo ven
 * libre—. Quien decide es el servidor; esto solo lo enseña.
 */
export default function AbrirDiasModal({
  duracionSegundos, guardando, onSimular, onAbrir, onCerrar,
}: Props) {
  /**
   * Cada horario con un id propio, y no identificado por su posición.
   *
   * `SelectorDias` guarda estado suyo —el mes que enseña—, así que con la
   * posición como clave, quitar un horario del medio le pasaba ese estado al que
   * ocupaba su sitio: el calendario se abría en el mes de uno que ya no estaba.
   */
  const [bloques, setBloques] = useState<(BloqueFechas & { id: number })[]>(
    () => [nuevoBloque()],
  );
  const [nota, setNota] = useState('');
  const [plan, setPlan] = useState<FilaPlan[] | null>(null);
  const [simulando, setSimulando] = useState(false);
  /** La vista previa no se pudo calcular. Hay que decirlo, no quedarse pensando. */
  const [fallo, setFallo] = useState(false);
  /** Cuál simulación es la última pedida: las que vuelven tarde se descartan. */
  const ultima = useRef(0);

  const candidatos = useMemo(() => expandirFechas(bloques), [bloques]);

  useEffect(() => {
    if (candidatos.length === 0) { setPlan(null); setFallo(false); return; }
    const mia = ultima.current + 1;
    ultima.current = mia;
    setSimulando(true);
    const id = window.setTimeout(async () => {
      const resultado = await onSimular(candidatos);
      // Una respuesta de una petición vieja no puede pisar a la nueva.
      if (ultima.current !== mia) return;
      setPlan(resultado);
      // Sin esto, una simulación que no vuelve dejaba el panel diciendo
      // «Calculando…» para siempre, y el botón apagado sin explicar por qué.
      setFallo(resultado === null);
      setSimulando(false);
    }, ESPERA_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidatos]);

  const nuevos = plan?.filter((f) => f.estado === 'nuevo') ?? [];
  const saltados = (plan?.length ?? 0) - nuevos.length;
  const huecos = nuevos.reduce(
    (t, f) => t + Math.floor(
      (new Date(f.fin).getTime() - new Date(f.inicio).getTime()) / (duracionSegundos * 1000),
    ),
    0,
  );
  const fechasDistintas = new Set(nuevos.map((f) => f.inicio.slice(0, 10))).size;

  function cambiarBloque(indice: number, cambio: Partial<BloqueFechas>) {
    setBloques((bs) => bs.map((b, i) => (i === indice ? { ...b, ...cambio } : b)));
  }

  return (
    <Modal isOpen onClose={onCerrar} title="Abrir días de entrevistas">
      <div className={styles.caja}>

        <div className={styles.campo}>
          <div className={styles.cabeceraCampo}>
            <span className={styles.etiqueta}>Horarios</span>
            <span className={styles.pista}>Elige los días y ponles su hora.</span>
          </div>

          <div className={styles.bloques}>
            {bloques.map((bloque, i) => (
              <div key={bloque.id} className={styles.bloque}>
                <SelectorDias
                  fechas={bloque.fechas}
                  deshabilitado={guardando}
                  onCambiar={(fechas) => cambiarBloque(i, { fechas })}
                />
                <div className={styles.horas}>
                  <input
                    type="time"
                    className={styles.input}
                    value={bloque.desde}
                    disabled={guardando}
                    onChange={(e) => cambiarBloque(i, { desde: e.target.value })}
                  />
                  <span className={styles.entre}>–</span>
                  <input
                    type="time"
                    className={styles.input}
                    value={bloque.hasta}
                    disabled={guardando}
                    onChange={(e) => cambiarBloque(i, { hasta: e.target.value })}
                  />
                </div>
                {bloques.length > 1 && (
                  <button
                    type="button"
                    className={styles.quitar}
                    disabled={guardando}
                    onClick={() => setBloques((bs) => bs.filter((_, j) => j !== i))}
                    aria-label="Quitar este horario"
                  >
                    <Icon name="close" size="sm" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              className={styles.anadir}
              disabled={guardando}
              onClick={() => setBloques((bs) => [...bs, nuevoBloque()])}
            >
              <Icon name="add" size="sm" /> Añadir horario
            </button>
          </div>
        </div>

        <label className={styles.campo}>
          <span className={styles.etiquetaSuave}>Nota para el alumno (opcional)</span>
          <input
            type="text"
            className={styles.input}
            placeholder="p. ej. Sala 3, o el enlace de la videollamada"
            value={nota}
            disabled={guardando}
            onChange={(e) => setNota(e.target.value)}
          />
        </label>

        {/* La vista previa: lo que decide si se pulsa o no. */}
        {candidatos.length > 0 && (
          <div className={styles.previa}>
            <div className={styles.previaCabecera}>
              <span className={styles.previaTitulo}>
                {fallo
                  ? 'No se pudo calcular la vista previa'
                  : simulando || !plan
                    ? 'Calculando…'
                    : nuevos.length === 0
                      ? 'No hay nada que abrir'
                      : `Se abrirán ${nuevos.length} horario${nuevos.length === 1 ? '' : 's'} en ${fechasDistintas} día${fechasDistintas === 1 ? '' : 's'}`}
              </span>
              {fallo && (
                <span className={styles.previaDato}>Vuelve a intentarlo en un momento.</span>
              )}
              {plan && !simulando && (
                <span className={styles.previaDato}>
                  {huecos} huecos{saltados > 0 && ` · ${saltados} se salta${saltados === 1 ? '' : 'n'}`}
                </span>
              )}
            </div>

            {plan && !simulando && (
              <ul className={styles.filas}>
                {plan.map((fila) => (
                  <li
                    key={`${fila.inicio}-${fila.fin}`}
                    className={`${styles.fila} ${fila.estado === 'solapa' ? styles.filaSolapa : ''} ${fila.estado === 'duplicado' ? styles.filaDuplicada : ''}`}
                  >
                    <span className={styles.filaFecha}>{fechaCorta(fila.inicio)}</span>
                    <span className={styles.filaHora}>
                      {hora(fila.inicio)} – {hora(fila.fin)}
                    </span>
                    <span className={styles.filaMotivo}>
                      {fila.estado === 'nuevo'
                        ? `${Math.floor((new Date(fila.fin).getTime() - new Date(fila.inicio).getTime()) / (duracionSegundos * 1000))} huecos`
                        : fila.estado === 'duplicado'
                          ? 'ese horario ya está abierto'
                          : `se pisa con el de ${hora(fila.choca!.inicio)} – ${hora(fila.choca!.fin)}`}
                    </span>
                    <span className={fila.estado === 'nuevo' ? styles.tagNuevo : styles.tagSalta}>
                      {fila.estado === 'nuevo' ? 'nuevo' : 'se salta'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className={styles.acciones}>
          <DashButton variant="outline" onClick={onCerrar} disabled={guardando}>Cancelar</DashButton>
          <DashButton
            onClick={() => onAbrir(candidatos, nota)}
            disabled={guardando || simulando || nuevos.length === 0}
          >
            {guardando
              ? 'Abriendo…'
              : `Abrir ${nuevos.length} horario${nuevos.length === 1 ? '' : 's'}`}
          </DashButton>
        </div>
      </div>
    </Modal>
  );
}
