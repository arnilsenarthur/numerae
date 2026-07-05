export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex-1 bg-zinc-50 dark:bg-black">{children}</div>
  );
}
