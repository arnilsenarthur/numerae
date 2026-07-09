"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useRef, useState } from "react";
import { authLinkClass, AuthCard } from "@/components/auth/auth-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, useValidatedField } from "@/components/ui/field";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/ui/otp-input";
import { validationRules } from "@/components/ui/field-validation";
import { useResendCooldown } from "@/hooks/use-resend-cooldown";
import { maskEmail } from "@/lib/mask-email";

function ResetMissingEmail() {
  return (
    <AuthCard
      title="Redefinir senha"
      subtitle="Precisamos do seu e-mail para validar o código."
      footer={
        <Link href="/forgot-password" className={authLinkClass}>
          Solicitar código
        </Link>
      }
    >
      <Alert variant="warning">
        Volte e informe o e-mail da sua conta para continuar.
      </Alert>
    </AuthCard>
  );
}

export function ResetPasswordForm() {
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

  const passwordField = useValidatedField(
    [
      validationRules.minLength(8, "Senha deve ter pelo menos 8 caracteres."),
      validationRules.pattern(/[A-Za-z]/, "Senha deve conter letras."),
      validationRules.pattern(/[0-9]/, "Senha deve conter números."),
    ],
    { required: true, showSuccess: false },
  );
  const confirmField = useValidatedField([], {
    required: true,
    requiredMessage: "Confirme a nova senha.",
    showSuccess: false,
  });
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const resetPassword = useCallback(async () => {
    if (!email || code.length !== 6 || submitLock.current) return;

    passwordField.markSubmitted();
    confirmField.markSubmitted();

    if (!passwordField.isValid) return;

    if (passwordField.value !== confirmField.value) {
      setConfirmError("As senhas não coincidem.");
      return;
    }

    setConfirmError(null);
    setError(null);
    setMessage(null);
    setLoading(true);
    submitLock.current = true;

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
          password: passwordField.value,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Erro ao redefinir senha.");
        return;
      }

      setMessage("Senha redefinida. Redirecionando para login…");
      router.push(`/login?email=${encodeURIComponent(email)}&reset=1`);
      router.refresh();
    } finally {
      setLoading(false);
      submitLock.current = false;
    }
  }, [code, confirmField, email, passwordField, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (code.length !== 6) {
      setCodeError("Digite os 6 dígitos do código.");
      return;
    }

    await resetPassword();
  }

  async function handleResend() {
    if (!email || !canResend || resending) return;

    setError(null);
    setMessage(null);
    setResending(true);

    const response = await fetch("/api/resend-reset-code", {
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
    startCooldown();
  }

  if (!email) {
    return <ResetMissingEmail />;
  }

  return (
    <AuthCard
      title="Redefinir senha"
      subtitle={`Digite o código enviado para ${maskEmail(email)} e escolha uma nova senha.`}
      footer={
        <Link href="/login" className={authLinkClass}>
          Voltar para login
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error ? <Alert variant="error">{error}</Alert> : null}
        {message ? <Alert variant="success">{message}</Alert> : null}

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

        <FormField delay={120}>
          <Field
            label="Nova senha"
            htmlFor="password"
            required
            state={passwordField.validation.state}
            message={passwordField.validation.message}
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={passwordField.value}
              onChange={(event) => passwordField.setValue(event.target.value)}
              onBlur={passwordField.bind.onBlur}
              {...passwordField.fieldProps}
            />
          </Field>
        </FormField>

        <FormField delay={160}>
          <Field
            label="Confirmar senha"
            htmlFor="confirmPassword"
            required
            state={confirmError ? "error" : confirmField.validation.state}
            message={confirmError ?? confirmField.validation.message}
          >
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmField.value}
              onChange={(event) => {
                confirmField.setValue(event.target.value);
                if (confirmError) setConfirmError(null);
              }}
              onBlur={confirmField.bind.onBlur}
              {...confirmField.fieldProps}
            />
          </Field>
        </FormField>

        <FormField delay={200}>
          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={code.length !== 6}
          >
            Redefinir senha
          </Button>
        </FormField>

        <FormField delay={240}>
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
