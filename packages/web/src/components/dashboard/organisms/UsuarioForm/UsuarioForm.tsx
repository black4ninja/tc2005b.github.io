import { useState } from 'react';
import TextInput from '../../atoms/TextInput/TextInput';
import DashButton from '../../atoms/DashButton/DashButton';
import styles from './UsuarioForm.module.css';

export type RolStaff = 'admin' | 'profesor';

export interface UsuarioData {
  id?: string;
  name: string;
  email: string;
  userType: RolStaff;
}

export interface UsuarioSavePayload {
  name: string;
  email: string;
  userType: RolStaff;
  /** Solo al crear: contraseña inicial. En edición no se envía. */
  password?: string;
}

interface UsuarioFormProps {
  usuario?: UsuarioData;
  onSave: (data: UsuarioSavePayload) => void;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * Alta/edición de personal (admin o profesor). Los alumnos NO se crean aquí.
 * Al crear pide una contraseña inicial (login por contraseña); al editar solo
 * nombre y rol (el correo es la identidad y no se cambia).
 */
export default function UsuarioForm({ usuario, onSave, onCancel, loading }: UsuarioFormProps) {
  const editando = !!usuario;
  const [name, setName] = useState(usuario?.name ?? '');
  const [email, setEmail] = useState(usuario?.email ?? '');
  const [userType, setUserType] = useState<RolStaff>(usuario?.userType ?? 'profesor');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {
    if (!name.trim()) { setError('El nombre es requerido'); return; }
    if (!editando && !email.trim()) { setError('El correo es requerido'); return; }
    if (!editando && password.length < 8) {
      setError('La contraseña inicial debe tener al menos 8 caracteres');
      return;
    }
    setError('');
    onSave({
      name: name.trim(),
      email: email.trim(),
      userType,
      ...(editando ? {} : { password }),
    });
  }

  return (
    <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <TextInput
        label="Nombre"
        placeholder="Nombre completo"
        icon="person"
        value={name}
        onChange={(v) => { setName(v); setError(''); }}
        disabled={loading}
      />
      <TextInput
        label="Correo"
        type="email"
        placeholder="correo@tec.mx"
        icon="email"
        value={email}
        onChange={(v) => { setEmail(v); setError(''); }}
        // El correo es la identidad de login: no se cambia al editar.
        disabled={loading || editando}
      />
      <div className={styles.field}>
        <label className={styles.label}>Rol</label>
        <select
          className={styles.select}
          value={userType}
          onChange={(e) => setUserType(e.target.value as RolStaff)}
          disabled={loading}
        >
          <option value="profesor">Profesor — entra directo a su grupo asignado</option>
          <option value="admin">Administrador — acceso completo al panel</option>
        </select>
      </div>
      {!editando && (
        <TextInput
          label="Contraseña inicial"
          type="password"
          placeholder="Mínimo 8 caracteres"
          icon="lock"
          value={password}
          onChange={(v) => { setPassword(v); setError(''); }}
          disabled={loading}
        />
      )}
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.actions}>
        <DashButton variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </DashButton>
        <DashButton disabled={loading} onClick={handleSubmit}>
          {loading ? 'Guardando...' : editando ? 'Actualizar' : 'Crear'}
        </DashButton>
      </div>
    </form>
  );
}
