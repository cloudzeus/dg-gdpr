"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoreHorizontal,
  Columns2,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ColumnDef<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  hideable?: boolean;
}

export interface RowAction<T> {
  label: string;
  onClick: (row: T) => void;
  destructive?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  getRowId: (row: T) => string;
  pageSize?: number;
  renderExpanded?: (row: T) => ReactNode;
  actions?: (row: T) => RowAction<T>[];
  onReorder?: (newData: T[]) => void;
  emptyMessage?: string;
}

// ─── Sortable Row ───────────────────────────────────────────────────────────

function SortableRow<T>({
  row,
  rowId,
  columns,
  colWidths,
  visibleCols,
  expanded,
  selected,
  onToggleExpand,
  onToggleSelect,
  actions,
  renderExpanded,
  canReorder,
}: {
  row: T;
  rowId: string;
  columns: ColumnDef<T>[];
  colWidths: Record<string, number>;
  visibleCols: Set<string>;
  expanded: boolean;
  selected: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  actions?: RowAction<T>[];
  renderExpanded?: (row: T) => ReactNode;
  canReorder: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: rowId });

  const [actionOpen, setActionOpen] = useState(false);
  const actionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!actionOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (actionRef.current && !actionRef.current.contains(e.target as Node)) {
        setActionOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [actionOpen]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const visibleColumns = columns.filter((c) => visibleCols.has(c.id));

  return (
    <>
      <tr
        ref={setNodeRef}
        style={style}
        className={cn(
          "border-b border-border transition-colors",
          selected ? "bg-primary/5" : "hover:bg-secondary/40",
          isDragging && "bg-secondary"
        )}
      >
        {/* Drag handle */}
        {canReorder && (
          <td className="w-8 px-2 py-2 text-muted-foreground">
            <button
              className="cursor-grab active:cursor-grabbing touch-none"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          </td>
        )}

        {/* Checkbox */}
        <td className="w-8 px-2 py-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="rounded border-border"
          />
        </td>

        {/* Expand toggle */}
        {renderExpanded && (
          <td className="w-8 px-2 py-2">
            <button
              onClick={onToggleExpand}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          </td>
        )}

        {/* Data columns */}
        {visibleColumns.map((col) => (
          <td
            key={col.id}
            style={{ width: colWidths[col.id], minWidth: col.minWidth ?? 80 }}
            className="px-3 py-2 text-sm align-top"
          >
            <div className="break-words">{col.cell(row)}</div>
          </td>
        ))}

        {/* Actions */}
        {actions && actions.length > 0 && (
          <td className="w-10 px-2 py-2 sticky right-0 bg-inherit">
            <div ref={actionRef} className="relative">
              <button
                onClick={() => setActionOpen((v) => !v)}
                className="flex items-center justify-center h-7 w-7 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {actionOpen && (
                <div className="absolute right-0 top-8 z-50 min-w-[160px] rounded-lg border border-border bg-popover shadow-lg py-1">
                  {actions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => {
                        action.onClick(row);
                        setActionOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 text-sm hover:bg-secondary transition-colors",
                        action.destructive && "text-destructive"
                      )}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </td>
        )}
      </tr>

      {/* Expanded content */}
      {expanded && renderExpanded && (
        <tr className="border-b border-border bg-secondary/20">
          <td
            colSpan={
              (canReorder ? 1 : 0) +
              1 + // checkbox
              (renderExpanded != null ? 1 : 0) +
              visibleColumns.length +
              (actions ? 1 : 0)
            }
            className="px-4 py-3"
          >
            {renderExpanded(row)}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Column Visibility Dropdown ─────────────────────────────────────────────

function ColumnVisibilityMenu<T>({
  columns,
  visible,
  onToggle,
}: {
  columns: ColumnDef<T>[];
  visible: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const hideableColumns = columns.filter((c) => c.hideable !== false);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors"
      >
        <Columns2 className="h-3.5 w-3.5" />
        Στήλες
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 min-w-[180px] rounded-lg border border-border bg-popover shadow-lg p-2 space-y-0.5">
          {hideableColumns.map((col) => (
            <label
              key={col.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                checked={visible.has(col.id)}
                onChange={() => onToggle(col.id)}
                className="rounded border-border"
              />
              {col.header}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main DataTable ─────────────────────────────────────────────────────────

export function DataTable<T>({
  data: initialData,
  columns,
  getRowId,
  pageSize: initialPageSize = 10,
  renderExpanded,
  actions,
  onReorder,
  emptyMessage = "Δεν υπάρχουν δεδομένα",
}: DataTableProps<T>) {
  const [data, setData] = useState<T[]>(initialData);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [colWidths, setColWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(columns.map((c) => [c.id, c.defaultWidth ?? 180]))
  );
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    new Set(columns.map((c) => c.id))
  );
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    setData(initialData);
    setPage(0);
  }, [initialData]);

  // Pagination
  const totalPages = Math.ceil(data.length / pageSize);
  const pageData = data.slice(page * pageSize, (page + 1) * pageSize);
  const pageIds = pageData.map(getRowId);

  // Select all on current page
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedRows.has(id));
  const toggleSelectAll = () => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Column resize
  const resizingCol = useRef<string | null>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  const startResize = useCallback(
    (colId: string, e: React.MouseEvent) => {
      e.preventDefault();
      resizingCol.current = colId;
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = colWidths[colId];

      const onMove = (me: MouseEvent) => {
        if (!resizingCol.current) return;
        const delta = me.clientX - resizeStartX.current;
        const minW = columns.find((c) => c.id === resizingCol.current)?.minWidth ?? 80;
        setColWidths((prev) => ({
          ...prev,
          [resizingCol.current!]: Math.max(minW, resizeStartWidth.current + delta),
        }));
      };
      const onUp = () => {
        resizingCol.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [colWidths, columns]
  );

  // Column visibility toggle
  const toggleColumn = (id: string) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(id) && next.size === 1) return prev; // keep at least one
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // DnD reorder
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setData((prev) => {
      const oldIndex = prev.findIndex((r) => getRowId(r) === active.id);
      const newIndex = prev.findIndex((r) => getRowId(r) === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      onReorder?.(next);
      return next;
    });
  };

  const visibleColumns = columns.filter((c) => visibleCols.has(c.id));
  const canReorder = !!onReorder;

  const totalCols =
    (canReorder ? 1 : 0) +
    1 + // checkbox
    (renderExpanded != null ? 1 : 0) +
    visibleColumns.length +
    (actions ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {selectedRows.size > 0 && (
            <span className="text-xs text-muted-foreground">
              {selectedRows.size} επιλεγμένα
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ColumnVisibilityMenu
            columns={columns}
            visible={visibleCols}
            onToggle={toggleColumn}
          />
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
            className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>{n} ανά σελίδα</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full border-collapse text-sm table-fixed">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {canReorder && <th className="w-8 px-2 py-2" />}
                <th className="w-8 px-2 py-2">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-border"
                  />
                </th>
                {renderExpanded && <th className="w-8 px-2 py-2" />}
                {visibleColumns.map((col) => (
                  <th
                    key={col.id}
                    style={{ width: colWidths[col.id], minWidth: col.minWidth ?? 80 }}
                    className="relative px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide select-none"
                  >
                    {col.header}
                    {/* Resize handle */}
                    <div
                      onMouseDown={(e) => startResize(col.id, e)}
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-primary/20 transition-colors"
                    />
                  </th>
                ))}
                {actions && <th className="w-10 px-2 py-2 sticky right-0 bg-secondary/50" />}
              </tr>
            </thead>
            <tbody>
              <SortableContext
                items={pageIds}
                strategy={verticalListSortingStrategy}
              >
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={totalCols} className="py-12 text-center text-sm text-muted-foreground">
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  pageData.map((row) => {
                    const rowId = getRowId(row);
                    return (
                      <SortableRow
                        key={rowId}
                        row={row}
                        rowId={rowId}
                        columns={columns}
                        colWidths={colWidths}
                        visibleCols={visibleCols}
                        expanded={expandedRows.has(rowId)}
                        selected={selectedRows.has(rowId)}
                        onToggleExpand={() =>
                          setExpandedRows((prev) => {
                            const next = new Set(prev);
                            next.has(rowId) ? next.delete(rowId) : next.add(rowId);
                            return next;
                          })
                        }
                        onToggleSelect={() =>
                          setSelectedRows((prev) => {
                            const next = new Set(prev);
                            next.has(rowId) ? next.delete(rowId) : next.add(rowId);
                            return next;
                          })
                        }
                        actions={actions?.(row)}
                        renderExpanded={renderExpanded}
                        canReorder={canReorder}
                      />
                    );
                  })
                )}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, data.length)} από {data.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="p-1 rounded hover:bg-secondary disabled:opacity-40 transition-colors"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded hover:bg-secondary disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2">
              Σελίδα {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded hover:bg-secondary disabled:opacity-40 transition-colors"
            >
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="p-1 rounded hover:bg-secondary disabled:opacity-40 transition-colors"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
