import styles from './DashButton.module.css';

interface DashButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'outline' | 'text';
  onClick?: () => void;
  className?: string;
}

export default function DashButton({ children, variant = 'primary', onClick, className = '' }: DashButtonProps) {
  return (
    <button className={`${styles.btn} ${styles[variant]} ${className}`} onClick={onClick}>
      {children}
    </button>
  );
}
