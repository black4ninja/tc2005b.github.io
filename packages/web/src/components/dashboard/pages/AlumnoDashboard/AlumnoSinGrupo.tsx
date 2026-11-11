import { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import styles from './AlumnoDashboard.module.css';

const API_BASE = '/api';

interface Wiki {
  slug: string;
  clave: string | null;
  nombre: string;
}

/**
 * El panel del alumno que entra SIN grupo activo.
 *
 * Existe para el alumno al que solo se le abrió una wiki por permiso individual
 * (`AccesoWikiAlumno`): no tiene calendario, malla ni perfil —todo eso es de un
 * grupo—, así que aquí solo hay dos cosas: sus wikis y su contraseña. La
 * contraseña va aparte porque es de la cuenta; si no, se quedaría para siempre
 * con la que le asignamos.
 */
export default function AlumnoSinGrupo() {
  const { user, sessionToken, updateUser } = useAuth();
  const passwordAsignada = user?.passwordAsignada === true;

  const [wikis, setWikis] = useState<Wiki[] | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [guardada, setGuardada] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!sessionToken) return;
    let cancelado = false;
    fetch(`${API_BASE}/alumno/wikis`, { headers: { 'x-session-token': sessionToken } })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelado) setWikis(json?.wikis ?? []);
      })
      .catch(() => {
        if (!cancelado) setWikis([]);
      });
    return () => {
      cancelado = true;
    };
  }, [sessionToken]);

  async function cambiarPassword() {
    setError('');
    setGuardada(false);
    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`${API_BASE}/alumno/cambiar-password`, {
        method: 'PUT',
        headers: { 'x-session-token': sessionToken ?? '', 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.message || 'Error al cambiar contraseña');
        return;
      }
      updateUser({ passwordAsignada: false });
      setNewPassword('');
      setConfirmPassword('');
      setGuardada(true);
    } catch {
      setError('Error al cambiar contraseña');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Mi Dashboard</h1>

      <div className={styles.profileBanner}>
        <span className="material-icons">info</span>
        {/* Sin wikis es el alumno dado de baja de todos sus grupos: a ese hay
            que decirle a quién acudir, no que tiene algo que no tiene. */}
        {wikis !== null && wikis.length === 0
          ? 'No estás inscrito en ningún grupo activo. Si crees que es un error, contacta a tu profesor.'
          : 'No estás inscrito en ningún grupo activo. Tienes acceso a las wikis que te abrieron.'}
      </div>

      <div className={styles.profileCard}>
        <h3 className={styles.chartTitle}>Mis wikis</h3>
        {wikis === null ? (
          <p className={styles.profileEmpty}>Cargando…</p>
        ) : wikis.length === 0 ? (
          <p className={styles.profileEmpty}>Todavía no tienes ninguna wiki asignada.</p>
        ) : (
          wikis.map((w) => (
            <div key={w.slug} className={styles.profileField}>
              {/* En pestaña nueva, igual que el ítem «Wiki» del menú. */}
              <a
                href={`/contenidos/${w.slug}/`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.profileLink}
              >
                {w.clave ? `${w.clave} — ${w.nombre}` : w.nombre}
              </a>
            </div>
          ))
        )}
      </div>

      <div className={styles.profileCard}>
        <div className={styles.passwordSection}>
          <h4 className={styles.passwordTitle}>
            {passwordAsignada ? 'Establece tu contraseña' : 'Cambiar contraseña'}
          </h4>
          <p className={styles.passwordHint}>
            {passwordAsignada
              ? 'La que usaste para entrar te la asignamos nosotros y la conocen otras personas. Elige una propia.'
              : 'Ya tienes una contraseña tuya. Puedes cambiarla si quieres.'}
          </p>
          <div className={styles.profileField}>
            <span className={styles.profileLabel}>Nueva contraseña</span>
            <input
              className={styles.profileInput}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div className={styles.profileField}>
            <span className={styles.profileLabel}>Confirmar contraseña</span>
            <input
              className={styles.profileInput}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
            />
          </div>
          {error && <span className={styles.fieldError}>{error}</span>}
          {guardada && <span className={styles.profileValue}>Contraseña actualizada.</span>}
        </div>
        <div className={styles.profileActions}>
          <button className={styles.btnSave} onClick={cambiarPassword} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </div>
      </div>
    </div>
  );
}
