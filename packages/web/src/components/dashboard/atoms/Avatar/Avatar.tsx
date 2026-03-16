import styles from './Avatar.module.css';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function Avatar({ src, name, size = 'md' }: AvatarProps) {
  if (src) {
    return <img className={`${styles.avatar} ${styles[size]}`} src={src} alt={name} />;
  }
  return (
    <div className={`${styles.avatar} ${styles.fallback} ${styles[size]}`}>
      {getInitials(name)}
    </div>
  );
}
