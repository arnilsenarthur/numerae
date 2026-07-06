"use client";

import { cn } from "@/lib/utils";

type DimmerProps = {
  open: boolean;
  onClose?: () => void;
  className?: string;
  blur?: boolean;
  zIndex?: number;
};

export function Dimmer({
  open,
  onClose,
  className,
  blur = false,
  zIndex = 40,
}: DimmerProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 min-h-[100dvh] w-screen bg-black/40 transition-opacity duration-300",
        blur && "backdrop-blur-[2px]",
        open ? "opacity-100" : "pointer-events-none opacity-0",
        className,
      )}
      style={{ zIndex }}
      onClick={onClose}
      aria-hidden={!open}
    />
  );
}
