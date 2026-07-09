"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authLinkClass, AuthCard } from "@/components/auth/auth-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, useValidatedField } from "@/components/ui/field";
import { validationRules } from "@/components/ui/field-validation";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { storePendingAuth } from "@/lib/auth-pending";
import { validateFormFields } from "@/lib/form-validation";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nameField = useValidatedField(
    [validationRules.minLength(2, "Nome deve ter pelo menos 2 caracteres.")],
    { required: true, showSuccess: false },
  );
  const emailField = useValidatedField([validationRules.email()], {
    required: true,
    showSuccess: false,
  });
  const passwordField = useValidatedField(
    [
      validationRules.minLength(8, "Senha deve ter pelo menos 8 caracteres."),
      validationRules.pattern(/[A-Za-z]/, "Senha deve conter letras."),
      validationRules.pattern(/[0-9]/, "Senha deve conter números."),
    ],
    { required: true, showSuccess: false },
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!validateFormFields([nameField, emailField, passwordField], event.currentTarget)) {
      return;
    }

    const payload = {
      name: nameField.value.trim(),
      email: emailField.value.trim().toLowerCase(),
      password: passwordField.value,
    };

    setLoading(true);

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Erro ao criar conta.");
      return;
    }

    storePendingAuth(payload.email, payload.password);
    router.push(`/verify?email=${encodeURIComponent(payload.email)}`);
  }

  return (
    <AuthCard
      title="Criar conta"
      subtitle="Comece a organizar suas finanças com segurança."
      step={{
        current: 1,
        total: 2,
        labels: ["Dados da conta", "Verificação de e-mail"],
      }}
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/login" className={authLinkClass}>
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert variant="error">{error}</Alert> : null}

        <FormField delay={80}>
          <Field
            label="Nome"
            htmlFor="name"
            required
            state={nameField.validation.state}
            message={nameField.validation.message}
          >
            <Input
              id="name"
              autoComplete="name"
              value={nameField.value}
              onChange={(event) => nameField.setValue(event.target.value)}
              onBlur={nameField.bind.onBlur}
              {...nameField.fieldProps}
            />
          </Field>
        </FormField>

        <FormField delay={130}>
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

        <FormField delay={180}>
          <Field
            label="Senha"
            htmlFor="password"
            required
            hint="Mínimo 8 caracteres, com letras e números."
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

        <FormField delay={230}>
          <Button type="submit" className="w-full" loading={loading}>
            Continuar
          </Button>
        </FormField>
      </form>
    </AuthCard>
  );
}
