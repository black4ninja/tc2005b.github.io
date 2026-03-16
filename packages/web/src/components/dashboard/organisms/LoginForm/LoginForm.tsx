import { useState } from 'react';
import styles from './LoginForm.module.css';
import TextInput from '../../atoms/TextInput/TextInput';
import DashButton from '../../atoms/DashButton/DashButton';
import Icon from '../../atoms/Icon/Icon';

export default function LoginForm() {
  const [email, setEmail] = useState('');

  return (
    <div className={styles.form}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Icon name="mail" size="sm" />
          Magic Link
        </h3>
        <p className={styles.sectionDesc}>
          Ingresa tu correo institucional y te enviaremos un enlace de acceso.
        </p>
        <TextInput
          label="Correo electrónico"
          type="email"
          placeholder="a00000000@tec.mx"
          icon="email"
          value={email}
          onChange={setEmail}
        />
        <DashButton variant="primary" className={styles.fullWidth}>
          <Icon name="send" size="sm" />
          Enviar enlace de acceso
        </DashButton>
      </div>

      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span className={styles.dividerText}>o</span>
        <span className={styles.dividerLine} />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Icon name="business" size="sm" />
          Microsoft
        </h3>
        <p className={styles.sectionDesc}>
          Usa tu cuenta institucional de Microsoft para iniciar sesión.
        </p>
        <DashButton variant="outline" className={styles.fullWidth}>
          <Icon name="login" size="sm" />
          Iniciar sesión con Microsoft
        </DashButton>
      </div>
    </div>
  );
}
