import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
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
  /** Optional class added to <tr> to visually distinguish certain rows (e.g. inactive). */
  getRowClassName?: (row: T) => string | undefined;
  /**
   * If provided, enables the "Columnas" toggle in the toolbar and persists
   * column visibility in localStorage under the key `adminTable.${tableId}.columnVisibility`.
   * Without this prop the toggle is hidden.
   */
  tableId?: string;
}

const STORAGE_PREFIX = 'adminTable';

function loadVisibility(tableId: string | undefined): VisibilityState {
  if (!tableId || typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}.${tableId}.columnVisibility`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveVisibility(tableId: string | undefined, value: VisibilityState) {
  if (!tableId || typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}.${tableId}.columnVisibility`, JSON.stringify(value));
  } catch {
    // ignore quota / private mode failures
  }
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
  getRowClassName,
  tableId,
}: AdminTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() =>
    loadVisibility(tableId),
  );
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const columnsBtnRef = useRef<HTMLButtonElement>(null);
  const columnsMenuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  // Persist visibility on every change
  useEffect(() => {
    saveVisibility(tableId, columnVisibility);
  }, [tableId, columnVisibility]);

  // Close menu on outside click / escape. El menú vive en un portal, así que el chequeo
  // de "fuera" debe contemplar tanto el botón como el menú (ambos están en árboles distintos).
  useEffect(() => {
    if (!columnsMenuOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const insideBtn = columnsBtnRef.current?.contains(target);
      const insideMenu = columnsMenuRef.current?.contains(target);
      if (!insideBtn && !insideMenu) {
        setColumnsMenuOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setColumnsMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [columnsMenuOpen]);

  // Calcula posición del menú en viewport (position: fixed) y la mantiene en
  // sincronía con scroll/resize. Usamos useLayoutEffect para evitar parpadeo
  // en el primer render del menú.
  useLayoutEffect(() => {
    if (!columnsMenuOpen) {
      setMenuPos(null);
      return;
    }
    function updatePos() {
      const btn = columnsBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
    updatePos();
    window.addEventListener('scroll', updatePos, true); // capture: catch scroll en cualquier ancestro
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [columnsMenuOpen]);

  const columns: ColumnDef<T, any>[] = actions
    ? [
        ...userColumns,
        {
          id: '_actions',
          header: 'Acciones',
          enableSorting: false,
          enableHiding: false,
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
    state: { sorting, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
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

  // Columns the user can toggle (excludes actions and any column with enableHiding: false)
  const toggleableColumns = table.getAllLeafColumns().filter((col) => col.getCanHide());
  const hiddenCount = toggleableColumns.filter((c) => !c.getIsVisible()).length;

  function resetVisibility() {
    setColumnVisibility({});
  }

  function getHeaderLabel(col: (typeof toggleableColumns)[number]): string {
    const header = col.columnDef.header;
    if (typeof header === 'string' && header.trim() !== '') return header;
    return col.id;
  }

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
          {tableId && toggleableColumns.length > 0 && (
            <div className={styles.columnsMenuWrap}>
              <button
                ref={columnsBtnRef}
                type="button"
                className={`${styles.columnsBtn} ${hiddenCount > 0 ? styles.columnsBtnDirty : ''}`}
                onClick={() => setColumnsMenuOpen((v) => !v)}
                title="Mostrar/ocultar columnas"
              >
                <span className="material-icons" style={{ fontSize: 18 }}>view_column</span>
                Columnas
                {hiddenCount > 0 && <span className={styles.columnsBadge}>{hiddenCount}</span>}
              </button>
              {columnsMenuOpen && menuPos && createPortal(
                <div
                  ref={columnsMenuRef}
                  className={styles.columnsMenu}
                  role="menu"
                  style={{
                    position: 'fixed',
                    top: menuPos.top,
                    right: menuPos.right,
                  }}
                >
                  <div className={styles.columnsMenuHeader}>
                    <span>Mostrar columnas</span>
                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        className={styles.columnsResetBtn}
                        onClick={resetVisibility}
                      >
                        Restablecer
                      </button>
                    )}
                  </div>
                  <div className={styles.columnsList}>
                    {toggleableColumns.map((col) => (
                      <label key={col.id} className={styles.columnsItem}>
                        <input
                          type="checkbox"
                          checked={col.getIsVisible()}
                          onChange={col.getToggleVisibilityHandler()}
                        />
                        <span>{getHeaderLabel(col)}</span>
                      </label>
                    ))}
                  </div>
                </div>,
                document.body,
              )}
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
                  <tr key={row.id} className={getRowClassName?.(row.original)}>
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
