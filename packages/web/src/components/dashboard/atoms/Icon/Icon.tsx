import styles from './Icon.module.css';

interface IconProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Icon({ name, size = 'md', className = '' }: IconProps) {
  return (
    <span className={`material-icons ${styles.icon} ${styles[size]} ${className}`}>
      {name}
    </span>
  );
}
