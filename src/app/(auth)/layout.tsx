export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-bg relative flex min-h-full flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="animate-float pointer-events-none absolute -left-20 top-16 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-float-delayed pointer-events-none absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl"
      />
      <div className="animate-pulse-soft pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
