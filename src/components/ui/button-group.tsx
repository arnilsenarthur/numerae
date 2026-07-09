"use client";

import { cn } from "@/lib/utils";
import {
  Children,
  cloneElement,
  isValidElement,
  ReactElement,
  ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { ui } from "@/components/ui/tokens";

type ButtonGroupProps = {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
};

export function ButtonGroup({
  children,
  className,
  fullWidth,
}: ButtonGroupProps) {
  const items = Children.toArray(children).filter(Boolean);

  return (
    <div
      className={cn(
        "inline-flex max-w-full overflow-x-auto overscroll-x-contain border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/60",
        "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        ui.controlRadius,
        fullWidth && "flex w-full",
        className,
      )}
      role="group"
    >
      {items.map((child, index) => {
        if (!isValidElement(child)) return child;

        const element = child as ReactElement<{ className?: string }>;
        const isFirst = index === 0;
        const isLast = index === items.length - 1;
        const isOnly = items.length === 1;

        return cloneElement(element, {
          className: cn(
            element.props.className,
            "!rounded-none border-0 shadow-none",
            isOnly && "!rounded-lg",
            !isOnly && isFirst && "!rounded-l-lg",
            !isOnly && isLast && "!rounded-r-lg",
            index > 0 && "border-l border-zinc-200 dark:border-zinc-700",
            fullWidth && "flex-1",
          ),
        });
      })}
    </div>
  );
}

type ButtonGroupItemProps = {
  active?: boolean;
  children: ReactNode;
  className?: string;
} & React.ComponentProps<typeof Button>;

export function ButtonGroupItem({
  active,
  children,
  className,
  variant = "ghost",
  size = "sm",
  ...props
}: ButtonGroupItemProps) {
  return (
    <Button
      variant={active ? "primary" : variant}
      size={size}
      className={cn(
        "min-w-[4.5rem] shrink-0 whitespace-nowrap",
        !active && "bg-transparent hover:bg-white dark:hover:bg-zinc-800",
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
