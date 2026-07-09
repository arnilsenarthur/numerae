import Link from "next/link";

type TipSourceLinkProps = {
  url: string;
  label?: string | null;
  className?: string;
};

export function TipSourceLink({ url, label, className }: TipSourceLinkProps) {
  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className ?? "text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"}
    >
      {label?.trim() || "Ver fonte"} ↗
    </Link>
  );
}
