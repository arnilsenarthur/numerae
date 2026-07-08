"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { authLinkClass, AuthCard } from "@/components/auth/auth-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, useValidatedField } from "@/components/ui/field";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { validationRules } from "@/components/ui/field-validation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const verified = searchParams.get("verified") === "1";
  const reset = searchParams.get("reset") === "1";
  const disabled = searchParams.get("error") === "disabled";
  const emailParam = searchParams.get("email") ?? "";

  const emailField = useValidatedField([validationRules.email()], {
    initialValue: emailParam,
    required: true,
    showSuccess: false,
  });
  const passwordField = useValidatedField([], {
    required: true,
    requiredMessage: "Senha obrigatória.",
    showSuccess: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (disabled) {
      void signOut({ redirect: false });
    }
  }, [disabled]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    emailField.markSubmitted();
    passwordField.markSubmitted();

    if (!emailField.isValid || !passwordField.isValid) return;

    setLoading(true);

    const result = await signIn("credentials", {
      email: emailField.value.trim().toLowerCase(),
      password: passwordField.value,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.error === "EMAIL_NOT_VERIFIED") {
        router.push(
          `/verify?email=${encodeURIComponent(emailField.value.trim().toLowerCase())}`,
        );
        return;
      }

      if (result.error === "ACCOUNT_DISABLED") {
        setError("Esta conta está desativada. Entre em contato com o suporte.");
        return;
      }

      setError("E-mail ou senha incorretos.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <AuthCard
      title="Entrar"
      subtitle="Acesse sua conta para gerenciar suas finanças."
      footer={
        <>
          Não tem conta?{" "}
          <Link href="/register" className={authLinkClass}>
            Criar conta
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {disabled ? (
          <Alert variant="error">
            Esta conta está desativada. Entre em contato com o suporte.
          </Alert>
        ) : null}

        {verified ? (
          <Alert variant="success">
            E-mail verificado. Entre com sua senha para continuar.
          </Alert>
        ) : null}

        {reset ? (
          <Alert variant="success">
            Senha redefinida com sucesso. Entre com sua nova senha.
          </Alert>
        ) : null}

        <FormField delay={80}>
          <Field
            label="E-mail"
            htmlFor="email"
            required
            state={emailField.validation.state}
            message={emailField.validation.message}
          >
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={emailField.value}
              onChange={(event) => emailField.setValue(event.target.value)}
              onBlur={emailField.bind.onBlur}
              {...emailField.fieldProps}
            />
          </Field>
        </FormField>

        <FormField delay={140}>
          <Field
            label="Senha"
            htmlFor="password"
            required
            state={passwordField.validation.state}
            message={passwordField.validation.message}
          >
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={passwordField.value}
              onChange={(event) => passwordField.setValue(event.target.value)}
              onBlur={passwordField.bind.onBlur}
              {...passwordField.fieldProps}
            />
          </Field>
        </FormField>

        {error ? <Alert variant="error">{error}</Alert> : null}

        <FormField delay={200}>
          <Button type="submit" className="w-full" loading={loading}>
            Entrar
          </Button>
        </FormField>

        <p className="text-center text-sm">
          <Link href="/forgot-password" className={authLinkClass}>
            Esqueci minha senha
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
