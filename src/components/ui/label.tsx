import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import { LabelHTMLAttributes } from "react";

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn(ui.label, className)} {...props} />;
}
