import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type FormFieldProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export function FormField({ children, delay = 0, className }: FormFieldProps) {
  return (
    <div
      className={cn("animate-fade-in-up opacity-0", className)}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      {children}
    </div>
  );
}
