import Icon from '../../atoms/Icon/Icon';
import ProfileMenu from '../../molecules/ProfileMenu/ProfileMenu';
import { useAuth } from '../../../../context/AuthContext';
import { useDiagramasNav } from '../../../../context/DiagramasNavContext';
import { useEjerciciosNav } from '../../../../context/EjerciciosNavContext';
import styles from './DashboardHeader.module.css';
import type { DashboardRole } from '../../../../types/dashboard';

interface DashboardHeaderProps {
  role: DashboardRole;
  collapsed: boolean;
  onToggleSidebar: () => void;
}

/**
 * Avance del módulo abierto —Diagramas o Ejercicios—, en la barra superior.
 *
 * Vive aquí y no en la cabecera de la página porque tiene que seguir visible
 * mientras se resuelve un ejercicio, que es cuando de verdad importa: el alumno
 * quiere ver subir el contador al enviar, y en la página del solver la cabecera
 * del listado ya no está.
 *
 * Sin ejercicios contables no se pinta nada: una barra al 0/0 no informa de
 * nada y ocuparía el sitio en todas las demás pantallas.
 */
function ProgresoModulo() {
  // Los dos módulos con árbol propio pintan su avance en el mismo sitio. Nunca
  // están activos a la vez: sus rutas son disjuntas.
  const diagramas = useDiagramasNav();
  const ejercicios = useEjerciciosNav();
  const { activo, progreso } = diagramas.activo ? diagramas : ejercicios;
  if (!activo || progreso.total === 0) return null;

  const porcentaje = Math.round((progreso.resueltos / progreso.total) * 100);
  return (
    <div
      className={styles.progreso}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={progreso.total}
      aria-valuenow={progreso.resueltos}
      aria-label="Ejercicios de diagrama resueltos"
    >
      <div className={styles.progresoBarra}>
        <div className={styles.progresoLlena} style={{ width: `${porcentaje}%` }} />
      </div>
      <span className={styles.progresoTexto}>
        {progreso.resueltos} / {progreso.total} resueltos
      </span>
    </div>
  );
}

export default function DashboardHeader({ role, collapsed, onToggleSidebar }: DashboardHeaderProps) {
  const { user } = useAuth();
  const profileName = user?.email || '';
  const profileRole =
    role === 'admin' ? 'Administrador' : role === 'profesor' ? 'Profesor' : 'Alumno';

  return (
    <header
      className={styles.header}
      style={{ left: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)' }}
    >
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <Icon name="menu" size="sm" />
        </button>
      </div>
      <div className={styles.center}>
        <ProgresoModulo />
      </div>
      <div className={styles.right}>
        <ProfileMenu name={profileName} role={profileRole} />
      </div>
    </header>
  );
}
