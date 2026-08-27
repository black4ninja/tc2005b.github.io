import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { Grupo } from './Grupo.js';
import type { PreguntaAsignacion } from './PreguntaAsignacion.js';

/** Los tres estados que el profesor manda. `finalizada` no se guarda: se deduce. */
export type EstadoProyeccion = 'espera' | 'corriendo' | 'detenido';

export const ESTADOS_PROYECCION: EstadoProyeccion[] = ['espera', 'corriendo', 'detenido'];

/**
 * Qué se está proyectando AHORA en un grupo.
 *
 * Existe porque el mando y la pantalla son dos aparatos distintos: la proyección
 * se abre en el iPad o en el proyector del aula y se dirige desde el panel del
 * portátil. Un `BroadcastChannel` habría bastado entre pestañas del mismo
 * navegador, pero no cruza dispositivos; con una fila por grupo, ambos leen lo
 * mismo desde cualquier sitio.
 *
 * Hay UNA por grupo y se reescribe: es estado efímero de una sesión, no
 * historial. Lo que hay que recordar de una entrevista ya vive en la asignación.
 *
 * El reloj NO corre aquí. Se guarda el instante de arranque y cada pantalla
 * calcula lo que queda: así no hace falta que el servidor despierte a nadie, y
 * dos pantallas abiertas enseñan el mismo número aunque una entre a mitad.
 */
export class ProyeccionPregunta extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('ProyeccionPregunta', attributes);
  }

  getGrupo(): Grupo | undefined {
    return this.get('grupo');
  }
  setGrupo(grupo: Grupo): void {
    this.set('grupo', grupo);
  }

  /** La asignación que está en pantalla. Vacío = no hay nada proyectándose. */
  getAsignacion(): PreguntaAsignacion | undefined {
    return this.get('asignacion');
  }
  setAsignacion(asignacion: PreguntaAsignacion | null): void {
    if (asignacion) this.set('asignacion', asignacion);
    else this.unset('asignacion');
  }

  getEstado(): EstadoProyeccion {
    const v = this.get('estado');
    return ESTADOS_PROYECCION.includes(v) ? v : 'espera';
  }
  setEstado(estado: EstadoProyeccion): void {
    this.set('estado', estado);
  }

  /**
   * FOTO de lo que hay en pantalla, copiada al elegir la asignación.
   *
   * Está desnormalizado a propósito. Leerlo por punteros costaba 310 ms —una
   * cadena de cinco `include` hasta la competencia y la colección— y esta fila
   * se lee cada vez que una pantalla se conecta o cambia algo. Copiado, la
   * lectura es una consulta plana de 70 ms.
   *
   * Que se quede vieja si alguien edita el enunciado a mitad de entrevista no es
   * un defecto: lo que se proyecta es lo que se puso, y cambia al cambiar de
   * asignación, que es cuando se vuelve a copiar.
   */
  getFoto(): {
    alumnoNombre: string;
    competencia: string | null;
    textoHtml: string;
    texto: string;
    intento: number;
    /** El tiempo de la MATERIA de esa pregunta. El del grupo manda y se lee vivo. */
    duracionColeccion: number | null;
  } | null {
    return this.get('foto') ?? null;
  }
  setFoto(foto: ReturnType<ProyeccionPregunta['getFoto']>): void {
    if (foto) this.set('foto', foto);
    else this.unset('foto');
  }

  /** Cuándo se pulsó «Iniciar». De aquí sale el reloj de todas las pantallas. */
  getIniciadoEn(): Date | null {
    return (this.get('iniciadoEn') as Date | undefined) ?? null;
  }
  setIniciadoEn(fecha: Date | null): void {
    if (fecha) this.set('iniciadoEn', fecha);
    else this.unset('iniciadoEn');
  }
}

Parse.Object.registerSubclass('ProyeccionPregunta', ProyeccionPregunta);
