import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import styles from './VerifyPage.module.css';
import Icon from '../../atoms/Icon/Icon';

type VerifyState = 'loading' | 'success' | 'error';

export default function VerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [state, setState] = useState<VerifyState>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState('error');
      setErrorMsg('No se proporcionó un token de verificación.');
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
          credentials: 'include',
        });

        if (cancelled) return;

        const data = await res.json();

        if (!res.ok) {
          setState('error');
          setErrorMsg(data.message || 'El enlace es inválido o ha expirado.');
          return;
        }

        login(data.sessionToken, data.user);
        setState('success');

        const redirectTo = data.user.userType === 'admin' ? '/admin' : '/alumno';
        setTimeout(() => {
          if (!cancelled) navigate(redirectTo, { replace: true });
        }, 1500);
      } catch {
        if (!cancelled) {
          setState('error');
          setErrorMsg('Error de conexión. Intenta de nuevo.');
        }
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [searchParams, login, navigate]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {state === 'loading' && (
          <>
            <div className={styles.iconWrap} data-state="loading">
              <Icon name="hourglass_top" size="lg" />
            </div>
            <h2 className={styles.title}>Verificando enlace...</h2>
            <p className={styles.desc}>Espera un momento mientras validamos tu acceso.</p>
          </>
        )}

        {state === 'success' && (
          <>
            <div className={styles.iconWrap} data-state="success">
              <Icon name="check_circle" size="lg" />
            </div>
            <h2 className={styles.title}>¡Acceso verificado!</h2>
            <p className={styles.desc}>Redirigiendo a tu panel...</p>
          </>
        )}

        {state === 'error' && (
          <>
            <div className={styles.iconWrap} data-state="error">
              <Icon name="error" size="lg" />
            </div>
            <h2 className={styles.title}>Verificación fallida</h2>
            <p className={styles.desc}>{errorMsg}</p>
            <Link to="/login" className={styles.retryLink}>
              <Icon name="arrow_back" size="sm" />
              Volver a iniciar sesión
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
