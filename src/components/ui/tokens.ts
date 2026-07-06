export const ui = {
  controlHeight: "min-h-9",
  controlHeightSm: "h-8",
  controlPadding: "px-2 py-1.5",
  controlText: "text-sm",
  controlRadius: "rounded-lg",
  innerRadius: "rounded-md",
  surfaceRadius: "rounded-xl",
  label: "mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400",
  fieldBorder:
    "border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950",
  fieldFocus:
    "focus-visible:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/15 dark:focus-visible:border-zinc-500",
  fieldOpen:
    "border-zinc-400 ring-2 ring-zinc-400/15 dark:border-zinc-500",
  popup:
    "rounded-xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-950",
  segmentActive: "font-semibold text-zinc-900 dark:text-zinc-100",
  segmentIdle: "text-zinc-400",
  itemSelected:
    "bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900",
  itemHover: "hover:bg-zinc-100 dark:hover:bg-zinc-800/80",
  iconButton:
    "cursor-pointer rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50",
  fieldTrigger: "cursor-pointer disabled:cursor-not-allowed",
  /** Portaled menus (Select, etc.) — above Modal (51) and header (30). */
  dropdownZIndex: 100,
} as const;
