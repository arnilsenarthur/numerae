import Link from "next/link";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { isAdminRole } from "@/lib/user-roles";
import { getModulesForCountry } from "@/modules/registry";

export default async function DashboardPage() {
  const session = await auth();
  const isAdmin = isAdminRole(session?.user?.role);
  const modules = getModulesForCountry("BR");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div>
        <p className="text-sm text-emerald-600">Painel</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h2 className="text-3xl font-semibold tracking-tight">
            Olá, {session?.user?.name ?? "usuário"}
          </h2>
          {isAdmin ? <Badge variant="default">Admin</Badge> : null}
        </div>
        <p className="mt-2 text-zinc-500">
          Planeje suas finanças — renda, gastos, metas, investimentos e impostos em um só lugar.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-400">
          Módulos
        </h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <article
              key={module.id}
              className={
                module.id === "money-map"
                  ? "flex flex-col rounded-xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/80 to-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-emerald-800/40 dark:from-emerald-950/30 dark:to-zinc-950"
                  : "flex flex-col rounded-xl border border-zinc-200 bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
              }
            >
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-medium">{module.name}</h4>
                {module.badge ? (
                  <Badge variant="success">{module.badge}</Badge>
                ) : null}
              </div>
              <p className="mt-2 flex-1 text-sm text-zinc-500">{module.description}</p>
              <div className="mt-4">
                <Link
                  href={module.href}
                  className="inline-flex h-8 items-center justify-center rounded-lg bg-emerald-600 px-2.5 text-xs font-medium text-white shadow-sm shadow-emerald-600/20 transition-all hover:bg-emerald-500"
                >
                  Abrir
                </Link>
              </div>
            </article>
          ))}

          {[
            {
              title: "Contas",
              description: "Organize saldos e contas bancárias.",
            },
            {
              title: "Open Finance",
              description: "Conecte bancos e automatize lançamentos.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-900/20"
            >
              <h4 className="text-lg font-medium text-zinc-700 dark:text-zinc-300">
                {item.title}
              </h4>
              <p className="mt-2 text-sm text-zinc-500">{item.description}</p>
              <p className="mt-4 text-xs uppercase tracking-wide text-zinc-400">
                Em breve
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
