import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import styles from './LoginForm.module.css';
import TextInput from '../../atoms/TextInput/TextInput';
import DashButton from '../../atoms/DashButton/DashButton';
import Icon from '../../atoms/Icon/Icon';
import { useAuth } from '../../../../context/AuthContext';

type FormState = 'idle' | 'sending' | 'error';

function normalizeEmail(input: string): string {
  let email = input.toLowerCase().trim();
  if (/^[a-z]\d{8}$/.test(email)) {
    email = `${email}@tec.mx`;
  }
  return email;
}

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const { login, isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.userType === 'alumno' && user.grupos?.length > 0) {
        navigate(`/alumno/grupos/${user.grupos[0].id}/calendario`, { replace: true });
      } else {
        navigate(user.userType === 'admin' ? '/admin' : '/alumno', { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  async function handleLogin() {
    if (!email.trim() || !password) return;

    setState('sending');
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizeEmail(email), password }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        setState('error');
        setErrorMsg(data.message || 'Credenciales inválidas');
        return;
      }

      login(data.sessionToken, data.user);

      const userType = data.user.userType;
      if (userType === 'alumno' && data.user.grupos?.length > 0) {
        navigate(`/alumno/grupos/${data.user.grupos[0].id}/calendario`, { replace: true });
      } else {
        navigate(userType === 'admin' ? '/admin' : '/alumno', { replace: true });
      }
    } catch {
      setState('error');
      setErrorMsg('Error de conexión. Intenta de nuevo.');
    }
  }

  return (
    <div className={styles.form}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Icon name="login" size="sm" />
          Iniciar sesión
        </h3>
        <p className={styles.sectionDesc}>
          Ingresa tu correo institucional y contraseña para acceder.
        </p>
        <TextInput
          label="Correo electrónico"
          type="email"
          placeholder="a00000000@tec.mx"
          icon="email"
          value={email}
          onChange={setEmail}
          disabled={state === 'sending'}
        />
        <TextInput
          label="Contraseña"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          icon="lock"
          endIcon={showPassword ? 'visibility_off' : 'visibility'}
          onEndIconClick={() => setShowPassword(!showPassword)}
          value={password}
          onChange={setPassword}
          disabled={state === 'sending'}
        />
        {errorMsg && <p className={styles.errorText}>{errorMsg}</p>}
        <DashButton
          variant="primary"
          className={styles.fullWidth}
          onClick={handleLogin}
          disabled={state === 'sending'}
        >
          <Icon name="login" size="sm" />
          {state === 'sending' ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </DashButton>
      </div>
    </div>
  );
}
