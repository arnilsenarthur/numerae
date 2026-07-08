import Image from "next/image";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/site";

type AppLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function AppLogo({ size = 40, className, priority }: AppLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt={SITE_NAME}
      width={size}
      height={size}
      priority={priority}
      className={cn("rounded-xl object-cover", className)}
    />
  );
}
