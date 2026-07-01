import { useState } from 'react';
import TextInput from '../../atoms/TextInput/TextInput';
import DashButton from '../../atoms/DashButton/DashButton';
import styles from './AlumnoForm.module.css';

interface AlumnoData {
  id?: string;
  name: string;
  email: string;
  matricula: string;
}

interface AlumnoFormProps {
  alumno?: AlumnoData;
  onSave: (data: { name: string; email: string; matricula: string }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function AlumnoForm({ alumno, onSave, onCancel, loading }: AlumnoFormProps) {
  const [name, setName] = useState(alumno?.name ?? '');
  const [email, setEmail] = useState(alumno?.email ?? '');
  const [matricula, setMatricula] = useState(alumno?.matricula ?? '');
  const [error, setError] = useState('');

  function handleSubmit() {
    if (!name.trim()) { setError('El nombre es requerido'); return; }
    if (!email.trim()) { setError('El correo es requerido'); return; }
    if (!matricula.trim()) { setError('La matrícula es requerida'); return; }
    setError('');
    onSave({ name: name.trim(), email: email.trim(), matricula: matricula.trim() });
  }

  return (
    <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <TextInput
        label="Nombre"
        placeholder="Nombre del alumno"
        icon="person"
        value={name}
        onChange={(v) => { setName(v); setError(''); }}
        disabled={loading}
        error={error && !name.trim() ? error : undefined}
      />
      <TextInput
        label="Correo"
        type="email"
        placeholder="correo@ejemplo.com"
        icon="email"
        value={email}
        onChange={(v) => { setEmail(v); setError(''); }}
        disabled={loading}
        error={error && name.trim() && !email.trim() ? error : undefined}
      />
      <TextInput
        label="Matrícula"
        placeholder="A00000000"
        icon="badge"
        value={matricula}
        onChange={(v) => { setMatricula(v); setError(''); }}
        disabled={loading}
        error={error && name.trim() && email.trim() && !matricula.trim() ? error : undefined}
      />
      <div className={styles.actions}>
        <DashButton variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </DashButton>
        <DashButton disabled={loading} onClick={handleSubmit}>
          {loading ? 'Guardando...' : alumno ? 'Actualizar' : 'Crear'}
        </DashButton>
      </div>
    </form>
  );
}
