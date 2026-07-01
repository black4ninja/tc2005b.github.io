import Avatar from '../../atoms/Avatar/Avatar';
import styles from './DataRow.module.css';
import type { DataRowItem } from '../../../../types/dashboard';

export default function DataRow({ avatar, name, subtitle, columns, status }: DataRowItem) {
  return (
    <tr className={styles.row}>
      <td className={styles.nameCell}>
        <Avatar src={avatar} name={name} size="sm" />
        <div className={styles.nameInfo}>
          <span className={styles.name}>{name}</span>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </div>
      </td>
      {columns.map((col, i) => (
        <td key={i} className={styles.cell}>{col}</td>
      ))}
      {status && (
        <td className={styles.cell}>
          <span className={styles.status} style={{ background: `${status.color}20`, color: status.color }}>
            {status.label}
          </span>
        </td>
      )}
    </tr>
  );
}
