import Link from "next/link";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-emerald-600">Numerae</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Olá, {session?.user?.name ?? "usuário"}
          </h1>
          <p className="mt-2 text-zinc-500">
            Base do app pronta. Em breve: metas, orçamentos e relatórios.
          </p>
        </div>
        <SignOutButton />
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Contas",
            description: "Organize saldos e contas bancárias.",
          },
          {
            title: "Metas",
            description: "Defina objetivos financeiros com prazos.",
          },
          {
            title: "Relatórios",
            description: "Acompanhe entradas, saídas e tendências.",
          },
        ].map((item) => (
          <article
            key={item.title}
            className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <h2 className="text-lg font-medium">{item.title}</h2>
            <p className="mt-2 text-sm text-zinc-500">{item.description}</p>
            <p className="mt-4 text-xs uppercase tracking-wide text-zinc-400">
              Em breve
            </p>
          </article>
        ))}
      </section>

      <p className="text-sm text-zinc-500">
        Conectado como{" "}
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {session?.user?.email}
        </span>
        .{" "}
        <Link href="/" className="text-emerald-600 hover:underline">
          Voltar ao início
        </Link>
      </p>
    </div>
  );
}
