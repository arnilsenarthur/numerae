import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import { forwardRef, HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export const Table = forwardRef<
  HTMLTableElement,
  HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div
    className={cn(
      "w-full overflow-x-auto overscroll-x-contain border border-zinc-200 dark:border-zinc-800",
      "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
      ui.surfaceRadius,
    )}
  >
    <table
      ref={ref}
      className={cn("w-full min-w-[32rem] border-collapse text-sm", className)}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn("border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/50", className)}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("divide-y divide-zinc-100 dark:divide-zinc-800/80", className)} {...props} />
));
TableBody.displayName = "TableBody";

export const TableFooter = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-zinc-200 bg-zinc-50/80 font-medium dark:border-zinc-800 dark:bg-zinc-900/50",
      className,
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

export const TableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }
>(({ className, interactive, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      interactive &&
        "transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/40",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

export const TableHead = forwardRef<
  HTMLTableCellElement,
  ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "px-3 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-wide text-zinc-500",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

export const TableCell = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "center" | "right" }
>(({ className, align = "left", ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-3 py-2.5 text-zinc-700 dark:text-zinc-300",
      align === "center" && "text-center",
      align === "right" && "text-right tabular-nums",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";
