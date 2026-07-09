"use client";

import { cn } from "@/lib/utils";
import { IconChevronDown, IconSearch } from "@/components/ui/icons";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReactNode, useEffect, useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export type DataTableColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number | Date;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  className?: string;
  getCellClassName?: (row: T) => string | undefined;
};

export type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (row: T) => string;
  pageSize?: number;
  /** `stack` renders rows as a vertical list (e.g. cards) instead of a table. */
  layout?: "table" | "stack";
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  emptyMessage?: string;
  /** Shown instead of the table when data is empty and there is no active search. */
  emptyState?: ReactNode;
  className?: string;
  toolbar?: ReactNode;
  onRowClick?: (row: T) => void;
};

function compareValues(a: string | number | Date, b: string | number | Date) {
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  return String(a).localeCompare(String(b), "pt-BR", { sensitivity: "base" });
}

export function DataTable<T>({
  data,
  columns,
  getRowKey,
  pageSize = 5,
  layout = "table",
  searchable = true,
  searchPlaceholder = "Filtrar…",
  searchFilter,
  emptyMessage = "Nenhum registro encontrado.",
  emptyState,
  className,
  toolbar,
  onRowClick,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return data;

    if (searchFilter) {
      return data.filter((row) => searchFilter(row, normalized));
    }

    return data.filter((row) =>
      columns.some((column) => {
        if (!column.sortValue) return false;
        return String(column.sortValue(row)).toLowerCase().includes(normalized);
      }),
    );
  }, [columns, data, query, searchFilter]);

  const sorted = useMemo(() => {
    if (!sortColumn) return filtered;

    const column = columns.find((item) => item.id === sortColumn);
    if (!column?.sortValue) return filtered;

    const direction = sortDirection === "asc" ? 1 : -1;

    return [...filtered].sort(
      (a, b) => compareValues(column.sortValue!(a), column.sortValue!(b)) * direction,
    );
  }, [columns, filtered, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages - 1));
  }, [totalPages]);

  const toggleSort = (columnId: string) => {
    const column = columns.find((item) => item.id === columnId);
    if (!column?.sortable && !column?.sortValue) return;

    setPage(0);

    if (sortColumn === columnId) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumn(columnId);
    setSortDirection("asc");
  };

  if (data.length === 0 && !query && emptyState) {
    return <div className={cn(className)}>{emptyState}</div>;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {searchable || toolbar ? (
        <div className="flex flex-wrap items-center gap-3">
          {searchable ? (
            <div className="relative max-w-sm flex-1">
              <IconSearch
                size="sm"
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                className="pl-8"
              />
            </div>
          ) : null}
          {toolbar ? <div className={cn(!searchable && "ml-auto")}>{toolbar}</div> : null}
        </div>
      ) : null}

      {layout === "stack" ? (
        <div className="space-y-3">
          {pageRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">{emptyMessage}</p>
          ) : (
            pageRows.map((row) => (
              <div
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(onRowClick && "cursor-pointer")}
              >
                {columns.map((column) => (
                  <div key={column.id}>{column.cell(row)}</div>
                ))}
              </div>
            ))
          )}
        </div>
      ) : (
        <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => {
              const active = sortColumn === column.id;
              const sortable = column.sortable ?? Boolean(column.sortValue);

              return (
                <TableHead
                  key={column.id}
                  className={cn(
                    column.align === "right" && "text-right",
                    column.align === "center" && "text-center",
                    column.className,
                  )}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.id)}
                      title={active ? "Inverter ordenação" : "Ordenar coluna"}
                      className={cn(
                        "group -mx-1 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-left transition-colors",
                        "hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
                        active
                          ? "font-semibold text-emerald-700 dark:text-emerald-400"
                          : "font-medium text-zinc-600 dark:text-zinc-300",
                      )}
                    >
                      {column.header}
                      <span
                        className={cn(
                          "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                            : "border-zinc-200 bg-zinc-50 text-zinc-500 group-hover:border-zinc-300 group-hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:group-hover:border-zinc-600 dark:group-hover:text-zinc-200",
                        )}
                        aria-hidden
                      >
                        <IconChevronDown
                          size="xs"
                          className={cn(
                            "transition-transform",
                            active && sortDirection === "desc" && "rotate-180",
                          )}
                        />
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-8 text-center text-zinc-500">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            pageRows.map((row) => (
              <TableRow
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "transition-none hover:bg-zinc-50 dark:hover:bg-zinc-900/40",
                  onRowClick && "cursor-pointer",
                )}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    className={cn(column.className, column.getCellClassName?.(row))}
                  >
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      )}

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        totalItems={sorted.length}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </div>
  );
}
