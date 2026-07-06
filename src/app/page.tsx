import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-1 flex-col justify-center px-4 py-16">
      <div className="max-w-2xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          Finanças pessoais com foco em metas
        </div>

        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Numerae
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          Organize suas finanças, acompanhe objetivos e tome decisões com clareza.
          Comece criando sua conta gratuitamente.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {session ? (
            <Link href="/dashboard">
              <Button>Ir para o painel</Button>
            </Link>
          ) : (
            <>
              <Link href="/register">
                <Button>Criar conta</Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary">Entrar</Button>
              </Link>
            </>
          )}
        </div>

        <p className="mt-12 text-sm text-zinc-400">
          <Link href="/design-system" className="hover:text-emerald-600">
            Ver biblioteca de componentes →
          </Link>
        </p>
      </div>
    </main>
  );
}
