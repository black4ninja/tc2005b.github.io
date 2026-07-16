/**
 * Semáforo simple para acotar corridas simultáneas del juez. Compilar Kotlin/
 * Swift es pesado (CPU/RAM); sin esto, varios envíos a la vez tumban el servidor.
 */
export class Semaforo {
  private disponibles: number;
  private cola: Array<() => void> = [];

  constructor(maximo: number) {
    this.disponibles = Math.max(1, maximo);
  }

  private async adquirir(): Promise<void> {
    if (this.disponibles > 0) {
      this.disponibles--;
      return;
    }
    await new Promise<void>((resolve) => this.cola.push(resolve));
    this.disponibles--;
  }

  private liberar(): void {
    this.disponibles++;
    const siguiente = this.cola.shift();
    if (siguiente) siguiente();
  }

  /** Corre `fn` respetando el cupo; libera aunque `fn` lance. */
  async ejecutar<T>(fn: () => Promise<T>): Promise<T> {
    await this.adquirir();
    try {
      return await fn();
    } finally {
      this.liberar();
    }
  }
}
