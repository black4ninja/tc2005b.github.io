import styles from './DashButton.module.css';

interface DashButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'outline' | 'text';
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export default function DashButton({ children, variant = 'primary', onClick, className = '', disabled, type = 'button' }: DashButtonProps) {
  return (
    <button type={type} className={`${styles.btn} ${styles[variant]} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
