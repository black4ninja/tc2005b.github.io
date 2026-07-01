import { useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import DashButton from '../../atoms/DashButton/DashButton';
import styles from './AdminDashboard.module.css';

const API_BASE = '/api';

export default function AdminDashboard() {
  const { sessionToken } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!newPassword) {
      errors.newPassword = 'La contraseña es requerida';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Mínimo 8 caracteres';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirma la contraseña';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!validate()) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/cambiar-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken ?? '',
        },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message ?? 'Error al cambiar contraseña');
      }

      setNewPassword('');
      setConfirmPassword('');
      setFieldErrors({});
      setMessage({ type: 'success', text: 'Contraseña actualizada exitosamente' });
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Dashboard Administrador</h1>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>
          <span className="material-icons">lock</span>
          Cambiar contraseña
        </h2>

        {message && (
          <div className={`${styles.message} ${message.type === 'success' ? styles.success : styles.error}`}>
            {message.text}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>Nueva contraseña</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, newPassword: '' })); }}
              placeholder="Mínimo 8 caracteres"
              className={fieldErrors.newPassword ? styles.inputError : ''}
            />
            {fieldErrors.newPassword && <span className={styles.fieldError}>{fieldErrors.newPassword}</span>}
          </div>

          <div className={styles.field}>
            <label>Confirmar contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, confirmPassword: '' })); }}
              placeholder="Repite la contraseña"
              className={fieldErrors.confirmPassword ? styles.inputError : ''}
            />
            {fieldErrors.confirmPassword && <span className={styles.fieldError}>{fieldErrors.confirmPassword}</span>}
          </div>

          <div className={styles.actions}>
            <DashButton variant="primary" type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Cambiar contraseña'}
            </DashButton>
          </div>
        </form>
      </div>
    </div>
  );
}
