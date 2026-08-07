import styles from './DashButton.module.css';

interface DashButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'outline' | 'text';
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  /**
   * Explicación al pasar el ratón. Opcional y sin valor por omisión: solo se
   * pone donde el botón necesita justificarse, típicamente para decir por qué
   * está deshabilitado, que es lo que un botón apagado no puede contar solo.
   */
  title?: string;
}

export default function DashButton({ children, variant = 'primary', onClick, className = '', disabled, type = 'button', title }: DashButtonProps) {
  return (
    <button type={type} className={`${styles.btn} ${styles[variant]} ${className}`} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
}
