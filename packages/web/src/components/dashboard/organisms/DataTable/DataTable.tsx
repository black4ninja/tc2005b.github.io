import DataRow from '../../molecules/DataRow/DataRow';
import styles from './DataTable.module.css';
import type { DataRowItem } from '../../../../types/dashboard';

interface DataTableProps {
  title: string;
  headers: string[];
  rows: DataRowItem[];
}

export default function DataTable({ title, headers, rows }: DataTableProps) {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} className={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <DataRow key={row.id} {...row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
