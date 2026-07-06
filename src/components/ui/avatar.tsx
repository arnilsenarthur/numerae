import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import { ImgHTMLAttributes } from "react";

type AvatarProps = {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  imgClassName?: string;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">;

const sizes = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};

export function Avatar({
  src,
  alt = "",
  fallback,
  size = "md",
  className,
  imgClassName,
  ...props
}: AvatarProps) {
  const initials =
    fallback ??
    alt
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-zinc-100 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
        ui.innerRadius,
        sizes[size],
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={cn("h-full w-full object-cover", imgClassName)}
          {...props}
        />
      ) : (
        initials || "?"
      )}
    </span>
  );
}
