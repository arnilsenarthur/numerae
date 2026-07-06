"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IconChevronDown, IconSearch } from "@/components/ui/icons";
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
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  emptyMessage?: string;
  className?: string;
  toolbar?: ReactNode;
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
  searchable = true,
  searchPlaceholder = "Filtrar…",
  searchFilter,
  emptyMessage = "Nenhum registro encontrado.",
  className,
  toolbar,
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
                      className={cn(
                        "inline-flex items-center gap-1 transition-colors hover:text-zinc-800 dark:hover:text-zinc-200",
                        active && "text-zinc-800 dark:text-zinc-200",
                      )}
                    >
                      {column.header}
                      <IconChevronDown
                        size="xs"
                        className={cn(
                          "transition-transform",
                          active && sortDirection === "desc" && "rotate-180",
                          !active && "opacity-40",
                        )}
                      />
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
              <TableRow key={getRowKey(row)} className="transition-none hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
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

      {sorted.length > pageSize ? (
        <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
          <span>
            {sorted.length === 0
              ? "0 resultados"
              : `${currentPage * pageSize + 1}–${Math.min((currentPage + 1) * pageSize, sorted.length)} de ${sorted.length}`}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage === 0}
              onClick={() => setPage((value) => Math.max(0, value - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
            >
              Próxima
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
