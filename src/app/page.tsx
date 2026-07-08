import Link from "next/link";
import { redirect } from "next/navigation";
import { AppLogo } from "@/components/brand/app-logo";
import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  IconChart,
  IconCoins,
  IconTarget,
  IconWallet,
} from "@/components/ui/icons";
import { auth } from "@/lib/auth";
import { SITE_NAME } from "@/lib/site";
import { ui } from "@/components/ui/tokens";
import { cn } from "@/lib/utils";

const highlights = [
  {
    icon: IconWallet,
    title: "Contas e lançamentos",
    description: "Registre entradas, saídas e transferências com categorias e histórico organizado.",
  },
  {
    icon: IconTarget,
    title: "Metas financeiras",
    description: "Defina objetivos, acompanhe o progresso e veja quanto falta para chegar lá.",
  },
  {
    icon: IconCoins,
    title: "Investimentos e mercado",
    description: "Posições, alocação sugerida, projeções e cotações em um só lugar.",
  },
  {
    icon: IconChart,
    title: "Visão consolidada",
    description: "Resumo do período, saldos e ferramentas de cálculo para decisões do dia a dia.",
  },
] as const;

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-6 flex justify-center">
            <AppLogo size={72} priority />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Sua central de finanças pessoais
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg">
            O {SITE_NAME} reúne contas, lançamentos, metas, investimentos e calculadoras em uma
            interface compacta — feita para usar no dia a dia, não para vender planos.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg">Começar agora</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary">
                Já tenho conta
              </Button>
            </Link>
          </div>
        </section>

        <section className="mt-16 sm:mt-20">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
              O que você encontra na plataforma
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Tudo integrado após o login — sem módulos soltos ou telas genéricas.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="border-zinc-200/80 dark:border-zinc-800">
                  <CardContent className="flex gap-3 p-4">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
                        ui.innerRadius,
                      )}
                    >
                      <Icon size="md" />
                    </div>
                    <div className="min-w-0 text-left">
                      <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                        {item.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-2xl text-center sm:mt-20">
          <p className="text-sm text-zinc-500">
            Crie sua conta com e-mail e senha. Após verificar o endereço, você acessa o painel
            completo em segundos.
          </p>
        </section>
      </div>
    </PublicShell>
  );
}
