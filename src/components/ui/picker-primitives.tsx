import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import { HoverTooltip } from "@/components/ui/tooltip";

type SegmentBoxProps = {
  value: string;
  placeholder: string;
  active?: boolean;
  className?: string;
};

export function SegmentBox({
  value,
  placeholder,
  active,
  className,
}: SegmentBoxProps) {
  const filled = value !== placeholder;

  return (
    <span
      className={cn(
        "inline-flex min-w-[1.5rem] items-center justify-center font-mono text-xs tabular-nums transition-colors duration-150 sm:min-w-[1.75rem]",
        filled || active ? ui.segmentActive : ui.segmentIdle,
        className,
      )}
    >
      {value}
    </span>
  );
}

export function SegmentSeparator({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium text-zinc-300 dark:text-zinc-600">{children}</span>
  );
}

export function PickerPopup({
  open,
  children,
  className,
}: {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute left-0 top-[calc(100%+0.375rem)] z-50 w-full min-w-[17rem] origin-top transition-all duration-200",
        ui.popup,
        open
          ? "pointer-events-auto scale-100 opacity-100"
          : "pointer-events-none scale-[0.98] opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PickerTrigger({
  open,
  onClick,
  onClear,
  clearable,
  hasValue,
  children,
  className,
}: {
  open: boolean;
  onClick: () => void;
  onClear?: () => void;
  clearable?: boolean;
  hasValue: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "relative flex w-full cursor-pointer items-center justify-between text-left transition-all duration-200",
        ui.controlHeight,
        ui.controlPadding,
        ui.controlRadius,
        ui.fieldBorder,
        "hover:border-zinc-300 dark:hover:border-zinc-600",
        open && ui.fieldOpen,
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-px overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>

      {clearable && hasValue ? (
        <HoverTooltip label="Limpar">
          <button
            type="button"
            aria-label="Limpar"
            onClick={(event) => {
              event.stopPropagation();
              onClear?.();
            }}
            className={cn(
              "ml-1.5 flex h-6 w-6 shrink-0 items-center justify-center text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800",
              ui.iconButton,
              ui.innerRadius,
            )}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </HoverTooltip>
      ) : (
        <svg
          className={cn(
            "ml-1.5 h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform duration-200",
            open && "rotate-180",
          )}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      )}
    </div>
  );
}
