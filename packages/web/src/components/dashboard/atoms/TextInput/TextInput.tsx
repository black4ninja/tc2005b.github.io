import styles from './TextInput.module.css';
import Icon from '../Icon/Icon';

interface TextInputProps {
  label?: string;
  type?: string;
  placeholder?: string;
  icon?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

export default function TextInput({ label, type = 'text', placeholder, icon, value, onChange, disabled, error }: TextInputProps) {
  return (
    <div className={styles.wrapper}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={`${styles.inputWrap} ${error ? styles.hasError : ''}`}>
        {icon && <Icon name={icon} size="sm" className={styles.icon} />}
        <input
          type={type}
          className={styles.input}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
