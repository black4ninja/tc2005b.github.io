import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';

/**
 * Categoría de un grupo: la materia o el nivel que imparte el profesor
 * ("Móviles", "Gráficas", "IA", "6to"). Es un catálogo administrable, no una
 * lista fija en código, porque cambia cada semestre según lo que se asigne.
 *
 * Lleva el COLOR con el que se pinta el grupo en tablas y selectores. El color
 * vive aquí y no en el grupo a propósito: así hay una sola fuente de verdad y
 * cambiarle el color a "IA" repinta de golpe todos sus grupos, en vez de
 * obligar a repasarlos uno a uno.
 *
 * Ojo con lo que el color NO resuelve: dos secciones de la misma materia
 * (TC2008B 101 y 102) comparten categoría y por tanto color. Distinguirlas es
 * trabajo de la sección destacada del nombre, no del color.
 */
export class CategoriaGrupo extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('CategoriaGrupo', attributes);
  }

  getNombre(): string {
    return this.get('nombre') ?? '';
  }
  setNombre(nombre: string): void {
    this.set('nombre', nombre);
  }

  /** Color en hexadecimal normalizado (`#rrggbb`, minúsculas). */
  getColor(): string {
    return this.get('color') ?? COLOR_POR_DEFECTO;
  }
  setColor(color: string): void {
    this.set('color', color);
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      nombre: this.getNombre(),
      color: this.getColor(),
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

/** Gris neutro para una categoría sin color (o con uno corrupto en la BD). */
export const COLOR_POR_DEFECTO = '#64748b';

/**
 * Paleta sugerida para el selector de color. Son ocho tonos que se distinguen
 * entre sí también en visión con deficiencia rojo-verde, que es la más común;
 * por eso no hay un rojo y un verde de luminosidad parecida.
 *
 * Es una SUGERENCIA de la interfaz, no una restricción: `normalizarColor`
 * acepta cualquier hex válido, para no encerrar al usuario en ocho opciones.
 */
export const PALETA_CATEGORIAS = [
  '#2563eb', // azul
  '#9333ea', // morado
  '#db2777', // rosa
  '#dc2626', // rojo
  '#ea580c', // naranja
  '#ca8a04', // ámbar
  '#16a34a', // verde
  '#0891b2', // cian
] as const;

/**
 * Normaliza un color de entrada a `#rrggbb` en minúsculas, o `null` si no es
 * un hexadecimal válido.
 *
 * Acepta la forma corta de tres dígitos (`#abc`) expandiéndola, y el hex sin
 * almohadilla, porque son las dos maneras en que se teclea a mano. Lo que no
 * acepta es nada más: sin esto, un `red` o un `javascript:` acabarían pegados
 * en un atributo `style` del cliente.
 */
export function normalizarColor(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;

  const limpio = valor.trim().toLowerCase().replace(/^#/, '');

  if (/^[0-9a-f]{3}$/.test(limpio)) {
    const [r, g, b] = limpio;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  if (/^[0-9a-f]{6}$/.test(limpio)) {
    return `#${limpio}`;
  }
  return null;
}

Parse.Object.registerSubclass('CategoriaGrupo', CategoriaGrupo);
