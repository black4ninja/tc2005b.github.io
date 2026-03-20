import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import DashButton from '../../atoms/DashButton/DashButton';
import styles from './AdminTable.module.css';

export interface ActionItem {
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface AdminTableProps<T> {
  title: string;
  columns: ColumnDef<T, any>[];
  data: T[];
  actions?: (row: T) => ActionItem[];
  onAdd?: () => void;
  addLabel?: string;
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  pagination?: boolean | number;
  getRowId?: (row: T) => string;
  loading?: boolean;
  initialSorting?: SortingState;
}

export default function AdminTable<T>({
  title,
  columns: userColumns,
  data,
  actions,
  onAdd,
  addLabel = 'Agregar',
  emptyMessage = 'No hay registros',
  searchable = true,
  searchPlaceholder = 'Buscar...',
  pagination = false,
  getRowId,
  loading = false,
  initialSorting = [],
}: AdminTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns: ColumnDef<T, any>[] = actions
    ? [
        ...userColumns,
        {
          id: '_actions',
          header: 'Acciones',
          enableSorting: false,
          cell: ({ row }) => {
            const items = actions(row.original);
            return (
              <div className={styles.rowActions}>
                {items.map((action) => (
                  <button
                    key={action.label}
                    className={`${styles.actionBtn} ${action.variant === 'danger' ? styles.actionDanger : ''}`}
                    onClick={action.onClick}
                    title={action.label}
                  >
                    {action.icon && (
                      <span className="material-icons" style={{ fontSize: 18 }}>{action.icon}</span>
                    )}
                  </button>
                ))}
              </div>
            );
          },
          meta: { isActions: true },
        },
      ]
    : userColumns;

  const pageSize = typeof pagination === 'number' ? pagination : 10;

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(pagination !== false && {
      getPaginationRowModel: getPaginationRowModel(),
      initialState: { pagination: { pageSize } },
    }),
    ...(getRowId && { getRowId }),
  });

  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.headerActions}>
          {searchable && (
            <div className={styles.searchWrap}>
              <span className={`material-icons ${styles.searchIcon}`}>search</span>
              <input
                className={styles.searchInput}
                type="text"
                placeholder={searchPlaceholder}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>
          )}
          {onAdd && (
            <DashButton onClick={onAdd}>
              <span className="material-icons" style={{ fontSize: 18 }}>add</span>
              {addLabel}
            </DashButton>
          )}
        </div>
      </div>

      {loading ? (
        <div className={styles.empty}>Cargando...</div>
      ) : rows.length === 0 ? (
        <div className={styles.empty}>{emptyMessage}</div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                {headerGroups.map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => {
                      const isActions = (header.column.columnDef.meta as any)?.isActions;
                      const canSort = header.column.getCanSort();
                      return (
                        <th
                          key={header.id}
                          className={`${isActions ? styles.actionsCol : ''} ${canSort ? styles.sortable : ''}`}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        >
                          <span className={styles.thContent}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                            {canSort && (
                              <span className={`material-icons ${styles.sortIcon}`}>
                                {header.column.getIsSorted() === 'asc'
                                  ? 'arrow_upward'
                                  : header.column.getIsSorted() === 'desc'
                                    ? 'arrow_downward'
                                    : 'unfold_more'}
                              </span>
                            )}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => {
                      const isActions = (cell.column.columnDef.meta as any)?.isActions;
                      const headerText = typeof cell.column.columnDef.header === 'string'
                        ? cell.column.columnDef.header
                        : '';
                      return (
                        <td
                          key={cell.id}
                          className={isActions ? styles.actionsCol : ''}
                          data-label={headerText}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination !== false && table.getPageCount() > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="material-icons">chevron_left</span>
              </button>
              <span className={styles.pageInfo}>
                Pagina {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
              </span>
              <button
                className={styles.pageBtn}
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="material-icons">chevron_right</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
