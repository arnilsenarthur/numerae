"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const devCode = searchParams.get("devCode");

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const response = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Erro ao verificar código.");
      return;
    }

    setMessage(data.message);
    setTimeout(() => router.push("/login"), 1500);
  }

  async function handleResend() {
    setError(null);
    setMessage(null);
    setResending(true);

    const response = await fetch("/api/resend-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    setResending(false);

    if (!response.ok) {
      setError(data.error ?? "Erro ao reenviar código.");
      return;
    }

    setMessage(
      data.devCode
        ? `${data.message} Código: ${data.devCode}`
        : data.message,
    );
  }

  return (
    <AuthCard
      title="Verificar e-mail"
      subtitle="Digite o código de 6 dígitos enviado para seu e-mail."
      footer={
        <Link href="/login" className="font-medium text-emerald-600">
          Voltar para login
        </Link>
      }
    >
      {devCode ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Modo desenvolvimento — código:{" "}
          <span className="font-mono font-semibold">{devCode}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="code">Código</Label>
          <Input
            id="code"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            required
          />
        </div>

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            {message}
          </p>
        ) : null}

        <Button type="submit" className="w-full" loading={loading}>
          Verificar
        </Button>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          loading={resending}
          onClick={handleResend}
        >
          Reenviar código
        </Button>
      </form>
    </AuthCard>
  );
}
