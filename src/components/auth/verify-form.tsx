"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { authLinkClass, AuthCard } from "@/components/auth/auth-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormField } from "@/components/ui/form-field";
import { OtpInput } from "@/components/ui/otp-input";
import { useResendCooldown } from "@/hooks/use-resend-cooldown";
import { consumePendingAuth } from "@/lib/auth-pending";
import { maskEmail } from "@/lib/mask-email";

function VerifyMissingEmail() {
  return (
    <AuthCard
      title="Verificar e-mail"
      subtitle="Precisamos do seu e-mail para enviar o código de verificação."
      footer={
        <>
          <Link href="/register" className={authLinkClass}>
            Criar conta
          </Link>
          {" · "}
          <Link href="/login" className={authLinkClass}>
            Entrar
          </Link>
        </>
      }
    >
      <Alert variant="warning">
        Volte ao cadastro ou faça login para continuar a verificação.
      </Alert>
    </AuthCard>
  );
}

export function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { cooldown, startCooldown, canResend } = useResendCooldown(60);
  const submitLock = useRef(false);
  const lastSubmittedCode = useRef<string | null>(null);

  const verifyCode = useCallback(
    async (nextCode: string) => {
      if (
        !email ||
        nextCode.length !== 6 ||
        submitLock.current ||
        lastSubmittedCode.current === nextCode
      ) {
        return;
      }

      setCodeError(null);
      setError(null);
      setMessage(null);
      setLoading(true);
      submitLock.current = true;
      lastSubmittedCode.current = nextCode;

      try {
        const response = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code: nextCode }),
        });

        const data = await response.json();

        if (!response.ok) {
          lastSubmittedCode.current = null;

          if (response.status === 409) {
            router.push(
              `/login?email=${encodeURIComponent(email)}&verified=1`,
            );
            return;
          }

          setError(data.error ?? "Erro ao verificar código.");
          return;
        }

        setMessage("Conta verificada. Entrando…");

        const pendingPassword = consumePendingAuth(email);
        if (pendingPassword) {
          const result = await signIn("credentials", {
            email,
            password: pendingPassword,
            redirect: false,
          });

          if (!result?.error) {
            router.push("/dashboard");
            router.refresh();
            return;
          }
        }

        router.push(`/login?email=${encodeURIComponent(email)}&verified=1`);
        router.refresh();
      } finally {
        setLoading(false);
        submitLock.current = false;
      }
    },
    [email, router],
  );

  useEffect(() => {
    if (code.length === 6 && !loading && !resending) {
      void verifyCode(code);
    }
  }, [code, loading, resending, verifyCode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (code.length !== 6) {
      setCodeError("Digite os 6 dígitos do código.");
      return;
    }

    await verifyCode(code);
  }

  async function handleResend() {
    if (!email || !canResend || resending) return;

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
      if (response.status === 429) startCooldown();
      return;
    }

    setMessage(data.message);
    setCode("");
    setCodeError(null);
    lastSubmittedCode.current = null;
    startCooldown();
  }

  if (!email) {
    return <VerifyMissingEmail />;
  }

  return (
    <AuthCard
      title="Verificar e-mail"
      subtitle={`Enviamos um código de 6 dígitos para ${maskEmail(email)}.`}
      step={{
        current: 2,
        total: 2,
        labels: ["Dados da conta", "Verificação de e-mail"],
      }}
      footer={
        <Link href="/login" className={authLinkClass}>
          Voltar para login
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <FormField delay={80}>
          <Field
            label="Código de verificação"
            state={codeError ? "error" : "default"}
            message={codeError ?? undefined}
          >
            <div className="mt-1">
              <OtpInput
                value={code}
                onChange={(next) => {
                  setCode(next);
                  if (codeError) setCodeError(null);
                }}
                disabled={loading}
              />
            </div>
          </Field>
        </FormField>

        <p className="text-center text-xs text-zinc-500">
          O código expira em 15 minutos. Confira também a pasta de spam.
        </p>

        {error ? <Alert variant="error">{error}</Alert> : null}
        {message ? <Alert variant="success">{message}</Alert> : null}

        <FormField delay={160}>
          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={code.length !== 6}
          >
            Verificar
          </Button>
        </FormField>

        <FormField delay={210}>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            loading={resending}
            disabled={!canResend || resending}
            onClick={handleResend}
          >
            {canResend ? "Reenviar código" : `Reenviar em ${cooldown}s`}
          </Button>
        </FormField>
      </form>
    </AuthCard>
  );
}
