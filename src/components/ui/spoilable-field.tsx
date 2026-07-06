"use client";

import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import { Input, NumberInput } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipAnchor } from "@/components/ui/tooltip";
import {
  formatTimeSinceUpdate,
  formatValidade,
  getSpoilableFieldMeta,
  spoilableFieldControlClass,
} from "@/lib/spoilable-field";
import { useEffect, useMemo, useState } from "react";

type SpoilableFieldBaseProps = {
  label?: string;
  updatedAt?: string | null;
  ttlSeconds: number;
  disabled?: boolean;
  saving?: boolean;
  className?: string;
  hint?: string;
  /** Inline table cell: transparent input styling. */
  embedded?: boolean;
  /** Tighter layout for SmartTable rows (non-embedded). */
  compact?: boolean;
  /** Tooltip position relative to the control. Use "below" in modals. */
  hintPlacement?: "above" | "below";
};

type SpoilableNumberFieldProps = SpoilableFieldBaseProps & {
  type: "number";
  value: number | null;
  onSave: (value: number | null) => void | Promise<void>;
  placeholder?: string;
  step?: string;
  min?: number;
};

type SpoilableTextFieldProps = SpoilableFieldBaseProps & {
  type: "text";
  value: string | null;
  onSave: (value: string | null) => void | Promise<void>;
  placeholder?: string;
};

type SpoilableBooleanFieldProps = SpoilableFieldBaseProps & {
  type: "boolean";
  value: boolean;
  onSave: (value: boolean) => void | Promise<void>;
};

export type SpoilableFieldProps =
  | SpoilableNumberFieldProps
  | SpoilableTextFieldProps
  | SpoilableBooleanFieldProps;

function FreshnessHint({
  updatedAt,
  expiresInSeconds,
  ttlSeconds,
  ageSeconds,
  placement = "above",
}: {
  updatedAt?: string | null;
  expiresInSeconds: number | null;
  ttlSeconds: number;
  ageSeconds: number | null;
  placement?: "above" | "below";
}) {
  return (
    <TooltipAnchor
      align="start"
      placement={placement}
      className="invisible opacity-0 transition-opacity group-hover/spoilable:visible group-hover/spoilable:opacity-100"
    >
      <Tooltip className="whitespace-normal text-left leading-snug">
        <span className="block">{formatValidade(expiresInSeconds, ttlSeconds)}</span>
        <span className="block opacity-80">{formatTimeSinceUpdate(updatedAt, ageSeconds)}</span>
      </Tooltip>
    </TooltipAnchor>
  );
}

export function SpoilableField(props: SpoilableFieldProps) {
  const {
    label,
    updatedAt,
    ttlSeconds,
    disabled,
    saving,
    className,
    hint,
    embedded,
    compact,
    hintPlacement = "above",
  } = props;
  const [draft, setDraft] = useState<string>("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const meta = useMemo(
    () => getSpoilableFieldMeta(updatedAt, ttlSeconds),
    [updatedAt, ttlSeconds, tick],
  );

  useEffect(() => {
    if (props.type === "number") {
      setDraft(props.value === null || props.value === undefined ? "" : String(props.value));
      return;
    }
    if (props.type === "text") {
      setDraft(props.value ?? "");
    }
  }, [props]);

  async function commitNumber(value: string) {
    if (props.type !== "number") return;
    const trimmed = value.trim();
    const next = trimmed === "" ? null : Number(trimmed);
    if (trimmed !== "" && Number.isNaN(next)) return;
    if (next === props.value) return;
    try {
      await props.onSave(next);
    } catch {
      // Caller surfaces the error (SmartTable / admin banner).
    }
  }

  async function commitText(value: string) {
    if (props.type !== "text") return;
    const next = value.trim() === "" ? null : value;
    if (next === props.value) return;
    await props.onSave(next);
  }

  const embeddedControlClass = cn(
    "w-full border-transparent bg-transparent shadow-none focus-visible:ring-0",
    ui.controlHeight,
    ui.controlText,
    ui.controlRadius,
  );

  const controlClass = cn(
    embedded ? embeddedControlClass : ui.fieldBorder,
    !embedded && ui.fieldFocus,
    ui.controlHeight,
    !embedded &&
      ttlSeconds > 0 &&
      (meta.freshness === "expired"
        ? spoilableFieldControlClass.expired
        : spoilableFieldControlClass.never),
  );

  if (compact && props.type === "boolean") {
    return (
      <Switch
        checked={props.value}
        disabled={disabled || saving}
        aria-label={hint ?? "Valor"}
        onChange={(event) => void props.onSave(event.target.checked)}
      />
    );
  }

  return (
    <div className={cn("group/spoilable relative w-full", !compact && "space-y-1", className)}>
      {label && !compact ? <span className={ui.label}>{label}</span> : null}

      <div className="relative">
        {props.type === "number" ? (
          <NumberInput
            value={draft}
            disabled={disabled || saving}
            placeholder={props.placeholder}
            step={props.step ?? "0.000001"}
            min={props.min}
            className={controlClass}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => void commitNumber(draft)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        ) : null}

        {props.type === "text" ? (
          <Input
            value={draft}
            disabled={disabled || saving}
            placeholder={props.placeholder}
            className={controlClass}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => void commitText(draft)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        ) : null}

        {props.type === "boolean" ? (
          <div
            className={cn(
              "inline-flex rounded-lg border px-2 py-1.5",
              controlClass,
              (disabled || saving) && "opacity-60",
            )}
          >
            <Switch
              label={hint ?? "Valor"}
              checked={props.value}
              disabled={disabled || saving}
              onChange={(event) => void props.onSave(event.target.checked)}
            />
          </div>
        ) : null}

        {ttlSeconds > 0 ? (
          <FreshnessHint
            updatedAt={updatedAt}
            expiresInSeconds={meta.expiresInSeconds}
            ttlSeconds={ttlSeconds}
            ageSeconds={meta.ageSeconds}
            placement={hintPlacement}
          />
        ) : null}
      </div>
    </div>
  );
}
