import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { describirError } from '../../../utils/errores';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Al cambiar, el boundary se reinicia. Se le pasa la ruta: sin esto, un error
   * deja la sección rota para siempre y navegar a otra parte del menú no la
   * recupera —React mantiene el estado de error hasta que alguien lo limpia—.
   */
  resetKey?: string;
  /** Aparece en el aviso para situar dónde ocurrió. */
  ambito?: string;
}

interface ErrorBoundaryState {
  error: unknown;
}

/**
 * Atrapa los errores de render y enseña lo que pasó.
 *
 * Sin esto, cualquier excepción durante el render desmonta el árbol entero de
 * React y deja la ventana EN BLANCO, sin mensaje ni rastro. Todos los fallos
 * distintos producen el mismo síntoma, así que el reporte que llega no puede
 * decir más que «no se ve nada» y hay que reconstruir la causa desde cero.
 *
 * Va por dentro de los layouts y no envolviendo la aplicación entera: así el
 * menú y la cabecera siguen ahí y se puede ir a otro sitio sin recargar. La
 * versión que envuelve todo queda como última red, para cuando lo que falla es
 * el propio layout.
 *
 * Tiene que ser una clase: React solo ofrece `componentDidCatch` /
 * `getDerivedStateFromError` en componentes de clase. No hay equivalente en
 * hooks, y por eso este es el único de su especie en el proyecto.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(prev: ErrorBoundaryProps): void {
    // Cambió la ruta: se vuelve a intentar pintar. Si el fallo sigue ahí, el
    // aviso reaparece solo.
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // A la consola también: es donde mira quien depura, y el `componentStack`
    // dice qué componente reventó, que el mensaje por sí solo no cuenta.
    console.error('[ErrorBoundary]', this.props.ambito ?? '', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    const { mensaje, detalle } = describirError(this.state.error);
    return (
      <div className={styles.caja} role="alert">
        <span className="material-icons" aria-hidden="true">error_outline</span>
        <h2 className={styles.titulo}>
          Algo falló al mostrar {this.props.ambito ?? 'esta sección'}
        </h2>
        <p className={styles.texto}>
          El resto del sitio sigue funcionando: puedes ir a otra sección desde el menú.
          Si vuelve a pasar, copia el detalle de abajo en el reporte.
        </p>
        <p className={styles.mensaje}>{mensaje}</p>
        {detalle && (
          // Plegado: quien lo lee no necesita la traza, y quien reporta sí.
          <details className={styles.detalle}>
            <summary>Detalle técnico</summary>
            <pre>{detalle}</pre>
          </details>
        )}
        <div className={styles.acciones}>
          <button className={styles.btn} onClick={() => this.setState({ error: null })}>
            Reintentar
          </button>
          <button
            className={`${styles.btn} ${styles.btnPri}`}
            onClick={() => window.location.reload()}
          >
            Recargar la página
          </button>
        </div>
      </div>
    );
  }
}
