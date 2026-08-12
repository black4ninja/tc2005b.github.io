import styles from './TextInput.module.css';
import Icon from '../Icon/Icon';

interface TextInputProps {
  label?: string;
  type?: string;
  placeholder?: string;
  icon?: string;
  endIcon?: string;
  onEndIconClick?: () => void;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  /** Para los campos de búsqueda, donde Enter dispara la consulta. */
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export default function TextInput({ label, type = 'text', placeholder, icon, endIcon, onEndIconClick, value, onChange, disabled, error, onKeyDown }: TextInputProps) {
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
          onKeyDown={onKeyDown}
          disabled={disabled}
        />
        {endIcon && (
          <button type="button" className={styles.endIconBtn} onClick={onEndIconClick} tabIndex={-1}>
            <Icon name={endIcon} size="sm" className={styles.icon} />
          </button>
        )}
      </div>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
