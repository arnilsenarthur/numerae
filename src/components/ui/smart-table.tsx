"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DataTable, type DataTableColumn, type DataTableProps } from "@/components/ui/data-table";
import { IconPlus } from "@/components/ui/icons";
import { ColorPicker } from "@/components/ui/color-picker";
import { Input, NumberInput, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/loader";
import { Select, type SelectOption } from "@/components/ui/select";
import { SpoilableField } from "@/components/ui/spoilable-field";
import { Switch } from "@/components/ui/switch";
import { HoverTooltip } from "@/components/ui/tooltip";
import { getSpoilableFieldCellClass } from "@/lib/spoilable-field";
import { ReactNode, useMemo, useState } from "react";
import { useLocale, useT } from "@/i18n/locale-provider";

export type SmartFieldType =
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "spoilable-number"
  | "readonly"
  | "textarea"
  | "color";

export type SmartFieldScope = "table" | "modal" | "both";

export type SmartTableModalContext<T> = {
  row: T | null;
  isCreating: boolean;
  saving?: boolean;
};

export type SmartTableField<T> = {
  type: SmartFieldType;
  getValue: (row: T) => string | number | boolean | null;
  onSave?: (row: T, value: string | number | boolean | null) => void | Promise<void>;
  getUpdatedAt?: (row: T) => string | null;
  getTtlSeconds?: (row: T) => number;
  placeholder?: string;
  step?: string;
  min?: number;
  hint?: string;
  options?: SelectOption[] | ((row: T) => SelectOption[]);
  disabled?: (row: T) => boolean;
  modalDisabled?: (ctx: SmartTableModalContext<T>) => boolean;
  formatReadonly?: (row: T, value: string | number | boolean | null) => ReactNode;
  scope?: SmartFieldScope;
  formKey?: string;
  modalLabel?: string;
  modalOrder?: number;
  modalRender?: (ctx: SmartTableModalContext<T> & {
    value: unknown;
    onChange: (value: unknown) => void;
    label: string;
    disabled: boolean;
  }) => ReactNode;
  tableWrap?: (content: ReactNode, row: T) => ReactNode;
};

export type SmartTableColumn<T> = {
  id: string;
  header: string;
  sortValue?: (row: T) => string | number | Date;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  className?: string;
  hidden?: boolean;
  field?: SmartTableField<T>;
  cell?: (row: T) => ReactNode;
};

export type SmartTableRowAction<T> = {
  id: string;
  label: string;
  onClick: (row: T) => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  show?: (row: T) => boolean;
};

export type SmartTableProps<T> = Omit<DataTableProps<T>, "columns"> & {
  columns: SmartTableColumn<T>[];
  onEdit?: (row: T) => void;
  editLabel?: string;
  showEdit?: boolean | ((row: T) => boolean);
  onCreate?: () => void;
  createLabel?: string;
  rowActions?: SmartTableRowAction<T>[];
};

const smartCellClass = "!h-px !py-1.5 align-top";
const smartBooleanCellClass = "!h-px !py-1.5 align-middle";

function isVerticallyCenteredField(type?: SmartFieldType) {
  return type === "boolean" || type === "color";
}

function smartCellClassName<T>(column: SmartTableColumn<T>) {
  const base = isVerticallyCenteredField(column.field?.type)
    ? smartBooleanCellClass
    : smartCellClass;
  return cn(base, column.className);
}

function defaultFieldScope(type: SmartFieldType): SmartFieldScope {
  if (type === "readonly") return "table";
  if (type === "textarea") return "modal";
  return "both";
}

function fieldScope<T>(field: SmartTableField<T>): SmartFieldScope {
  return field.scope ?? defaultFieldScope(field.type);
}

/** Prefer form state; fall back to row when the form key is missing (formKey ≠ column id). */
function resolveModalFieldValue<T>(
  field: SmartTableField<T>,
  form: Record<string, unknown>,
  formKey: string,
  row: T | null,
): unknown {
  if (Object.prototype.hasOwnProperty.call(form, formKey)) {
    return form[formKey];
  }
  if (row) {
    return field.getValue(row);
  }
  return undefined;
}

function normalizeSelectValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function CellSavingOverlay({
  saving,
  children,
}: {
  saving: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative min-w-0">
      {children}
      {saving ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-white/65 backdrop-blur-[1px] dark:bg-zinc-950/65"
          aria-busy="true"
          aria-live="polite"
        >
          <Spinner size="sm" />
        </div>
      ) : null}
    </div>
  );
}

function SmartTableCell<T>({
  row,
  column,
  rowKey,
  savingKey,
  onSaveStart,
  onSaveEnd,
}: {
  row: T;
  column: SmartTableColumn<T>;
  rowKey: string;
  savingKey: string | null;
  onSaveStart: (key: string) => void;
  onSaveEnd: () => void;
}) {
  const field = column.field;
  if (!field) return column.cell?.(row) ?? null;

  const scope = fieldScope(field);
  if (scope === "modal") return column.cell?.(row) ?? null;

  const cellKey = `${rowKey}:${column.id}`;
  const saving = savingKey === cellKey;
  const disabled = field.disabled?.(row) ?? false;
  const value = field.getValue(row);

  if (field.type === "readonly") {
    return field.formatReadonly?.(row, value) ?? <span>{value ?? "—"}</span>;
  }

  function withSavingOverlay(content: ReactNode) {
    const wrapped = <CellSavingOverlay saving={saving}>{content}</CellSavingOverlay>;
    return field!.tableWrap ? field!.tableWrap(wrapped, row) : wrapped;
  }

  async function save(next: string | number | boolean | null) {
    if (!field?.onSave || disabled) return;
    onSaveStart(cellKey);
    try {
      await field.onSave(row, next);
    } catch (error) {
      console.error("[SmartTable] save failed", error);
      throw error;
    } finally {
      onSaveEnd();
    }
  }

  if (field.type === "spoilable-number") {
    const updatedAt = field.getUpdatedAt?.(row) ?? null;
    const ttlSeconds = field.getTtlSeconds?.(row) ?? 3600;
    const cellClass = disabled ? "" : getSpoilableFieldCellClass(updatedAt, ttlSeconds);

    return withSavingOverlay(
      <div className={cn("inline-flex min-w-[6.5rem] rounded-md px-1 py-0.5", cellClass)}>
        <SpoilableField
          type="number"
          embedded
          value={typeof value === "number" ? value : value === null ? null : Number(value)}
          updatedAt={updatedAt}
          ttlSeconds={ttlSeconds}
          placeholder={field.placeholder}
          step={field.step}
          min={field.min}
          disabled={disabled}
          saving={saving}
          className="w-full"
          onSave={(next) => save(next)}
        />
      </div>,
    );
  }

  if (field.type === "number") {
    return withSavingOverlay(
      <SpoilableField
        type="number"
        compact
        value={typeof value === "number" ? value : value === null ? null : Number(value)}
        updatedAt={null}
        ttlSeconds={0}
        placeholder={field.placeholder}
        step={field.step}
        min={field.min}
        disabled={disabled}
        saving={saving}
        className="min-w-[5rem]"
        onSave={(next) => save(next)}
      />,
    );
  }

  if (field.type === "text") {
    return withSavingOverlay(
      <SpoilableField
        type="text"
        compact
        value={value === null || value === undefined ? null : String(value)}
        updatedAt={null}
        ttlSeconds={0}
        placeholder={field.placeholder}
        disabled={disabled}
        saving={saving}
        onSave={(next) => save(next)}
      />,
    );
  }

  if (field.type === "boolean") {
    const switchControl = (
      <Switch
        checked={Boolean(value)}
        disabled={disabled || saving}
        aria-label={field.hint ?? column.header}
        onChange={(event) => void save(event.target.checked)}
      />
    );

    return withSavingOverlay(
      <div className="flex min-h-9 items-center justify-center">
        {field.hint ? (
          <HoverTooltip label={field.hint}>{switchControl}</HoverTooltip>
        ) : (
          switchControl
        )}
      </div>,
    );
  }

  if (field.type === "color") {
    return withSavingOverlay(
      <div className="flex min-h-9 items-center justify-center">
        <ColorPicker
          compact
          value={String(value ?? "")}
          disabled={disabled || saving}
          onChange={(next) => void save(next)}
        />
      </div>,
    );
  }

  if (field.type === "select") {
    const options = typeof field.options === "function" ? field.options(row) : field.options ?? [];
    return withSavingOverlay(
      <Select
        options={options}
        value={String(value ?? "")}
        disabled={disabled || saving}
        size="sm"
        onChange={(next) => void save(next)}
      />,
    );
  }

  return column.cell?.(row) ?? null;
}

type ModalFieldEntry<T> = {
  column: SmartTableColumn<T>;
  field: SmartTableField<T>;
};

function collectModalFields<T>(
  columns: SmartTableColumn<T>[],
  locale: string,
): ModalFieldEntry<T>[] {
  return columns
    .filter((column) => {
      if (!column.field) return false;
      const scope = fieldScope(column.field);
      return scope === "modal" || scope === "both";
    })
    .sort(
      (a, b) =>
        (a.field!.modalOrder ?? 0) - (b.field!.modalOrder ?? 0) ||
        a.header.localeCompare(b.header, locale),
    )
    .map((column) => ({ column, field: column.field! }));
}

function renderModalControl<T>({
  column,
  field,
  ctx,
  value,
  onChange,
}: {
  column: SmartTableColumn<T>;
  field: SmartTableField<T>;
  ctx: SmartTableModalContext<T>;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = field.modalLabel ?? column.header;
  const disabled = Boolean(
    (ctx.row ? field.disabled?.(ctx.row) : false) ||
      field.modalDisabled?.(ctx) ||
      ctx.saving,
  );

  if (field.modalRender) {
    return field.modalRender({ ...ctx, value, onChange, label, disabled });
  }

  if (field.type === "boolean") {
    return (
      <Switch
        label={label}
        checked={Boolean(value)}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    );
  }

  if (field.type === "select") {
    const options =
      typeof field.options === "function" && ctx.row
        ? field.options(ctx.row)
        : typeof field.options === "function"
          ? field.options({} as T)
          : field.options ?? [];

    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <Select
          options={options}
          value={normalizeSelectValue(value)}
          disabled={disabled}
          onChange={(next) => onChange(next)}
        />
      </div>
    );
  }

  if (field.type === "spoilable-number" && ctx.row) {
    const updatedAt = field.getUpdatedAt?.(ctx.row) ?? null;
    const ttlSeconds = field.getTtlSeconds?.(ctx.row) ?? 3600;
    const cellClass = disabled ? "" : getSpoilableFieldCellClass(updatedAt, ttlSeconds);

    return (
      <div className={cn("rounded-lg px-3 py-2", cellClass)}>
        <SpoilableField
          type="number"
          label={label}
          hintPlacement="below"
          value={typeof value === "number" ? value : value === null || value === "" ? null : Number(value)}
          updatedAt={updatedAt}
          ttlSeconds={ttlSeconds}
          placeholder={field.placeholder}
          step={field.step}
          min={field.min}
          disabled={disabled}
          saving={ctx.saving}
          onSave={(next) => {
            onChange(next);
            if (field.onSave) void field.onSave(ctx.row!, next);
          }}
        />
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <NumberInput
          value={value === null || value === undefined ? "" : String(value)}
          disabled={disabled}
          placeholder={field.placeholder}
          step={field.step}
          min={field.min}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <Textarea
          value={String(value ?? "")}
          disabled={disabled}
          placeholder={field.placeholder}
          className="min-h-20"
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
  }

  if (field.type === "color") {
    return (
      <ColorPicker
        label={label}
        value={String(value ?? "")}
        disabled={disabled}
        placeholder={field.placeholder ?? "#10B981"}
        onChange={(next) => onChange(next)}
      />
    );
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        value={String(value ?? "")}
        disabled={disabled}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/** Renders editable columns from a SmartTable config inside edit/create modals. */
export function SmartTableModalFields<T>({
  columns,
  form,
  onChange,
  row = null,
  isCreating = false,
  saving,
  excludeIds = [],
}: {
  columns: SmartTableColumn<T>[];
  form: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  row?: T | null;
  isCreating?: boolean;
  saving?: boolean;
  excludeIds?: string[];
}) {
  const { locale } = useLocale();
  const entries = useMemo(
    () =>
      collectModalFields(columns, locale).filter(({ column }) => !excludeIds.includes(column.id)),
    [columns, excludeIds, locale],
  );

  const ctx: SmartTableModalContext<T> = { row, isCreating, saving };

  if (entries.length === 0) return null;

  return (
    <div className="space-y-4">
      {entries.map(({ column, field }) => {
        const formKey = field.formKey ?? column.id;
        const resolvedValue = resolveModalFieldValue(field, form, formKey, row);
        return (
          <div key={column.id}>
            {renderModalControl({
              column,
              field,
              ctx,
              value: resolvedValue,
              onChange: (value) => onChange(formKey, value),
            })}
          </div>
        );
      })}
    </div>
  );
}

export function SmartTable<T>({
  columns,
  onEdit,
  editLabel,
  showEdit = true,
  onCreate,
  createLabel,
  rowActions = [],
  getRowKey,
  ...tableProps
}: SmartTableProps<T>) {
  const t = useT();
  const resolvedEditLabel = editLabel ?? t("ui.smartTable.edit");
  const resolvedCreateLabel = createLabel ?? t("ui.smartTable.add");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const visibleColumns = useMemo(
    () => columns.filter((column) => !column.hidden),
    [columns],
  );

  const dataColumns = useMemo<DataTableColumn<T>[]>(() => {
    const mapped = visibleColumns.map((column) => ({
      id: column.id,
      header: column.header,
      sortValue: column.sortValue,
      align: column.align,
      sortable: column.sortable,
      className: smartCellClassName(column),
      cell: (row: T) =>
        column.field ? (
          <SmartTableCell
            row={row}
            column={column}
            rowKey={getRowKey(row)}
            savingKey={savingKey}
            onSaveStart={setSavingKey}
            onSaveEnd={() => setSavingKey(null)}
          />
        ) : (
          column.cell?.(row)
        ),
    }));

    const hasRowActions = rowActions.length > 0 || onEdit;

    if (hasRowActions) {
      mapped.push({
        id: "_actions",
        header: "",
        sortValue: undefined,
        align: "right",
        sortable: false,
        className: cn(smartCellClass, "whitespace-nowrap"),
        cell: (row: T) => {
          const actions = rowActions.filter(
            (action) => action.show?.(row) ?? true,
          );
          const showEditButton =
            onEdit &&
            (typeof showEdit === "function" ? showEdit(row) : showEdit);

          if (actions.length === 0 && !showEditButton) return null;

          return (
            <div className="flex flex-wrap justify-end gap-1">
              {actions.map((action) => (
                <Button
                  key={action.id}
                  type="button"
                  size="sm"
                  variant={action.variant ?? "secondary"}
                  onClick={() => action.onClick(row)}
                >
                  {action.label}
                </Button>
              ))}
              {showEditButton ? (
                <Button type="button" size="sm" variant="secondary" onClick={() => onEdit(row)}>
                  {resolvedEditLabel}
                </Button>
              ) : null}
            </div>
          );
        },
      });
    }

    return mapped;
  }, [visibleColumns, resolvedEditLabel, getRowKey, onEdit, rowActions, savingKey, showEdit]);

  const toolbar = onCreate ? (
    <Button type="button" onClick={onCreate}>
      <IconPlus size="sm" />
      {resolvedCreateLabel}
    </Button>
  ) : null;

  return (
    <DataTable
      {...tableProps}
      columns={dataColumns}
      getRowKey={getRowKey}
      toolbar={toolbar}
    />
  );
}

/** Alias for SmartTableModalFields — column-driven forms shared with SmartTable. */
export { SmartTableModalFields as SmartForm };
