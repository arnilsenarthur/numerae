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
import { useT } from "@/i18n/locale-provider";

export function RegisterForm() {
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nameField = useValidatedField(
    [validationRules.minLength(2, t("auth.validation.nameMinLength"))],
    { required: true, showSuccess: false },
  );
  const emailField = useValidatedField([validationRules.email()], {
    required: true,
    showSuccess: false,
  });
  const passwordField = useValidatedField(
    [
      validationRules.minLength(8, t("auth.validation.passwordMinLength")),
      validationRules.pattern(/[A-Za-z]/, t("auth.validation.passwordLetters")),
      validationRules.pattern(/[0-9]/, t("auth.validation.passwordNumbers")),
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
      setError(data.error ?? t("auth.register.errorCreate"));
      return;
    }

    storePendingAuth(payload.email, payload.password);
    router.push(`/verify?email=${encodeURIComponent(payload.email)}`);
  }

  return (
    <AuthCard
      title={t("auth.register.title")}
      subtitle={t("auth.register.subtitle")}
      step={{
        current: 1,
        total: 2,
        labels: [t("auth.register.stepAccount"), t("auth.register.stepVerify")],
      }}
      footer={
        <>
          {t("auth.register.hasAccount")}{" "}
          <Link href="/login" className={authLinkClass}>
            {t("auth.register.login")}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert variant="error">{error}</Alert> : null}

        <FormField delay={80}>
          <Field
            label={t("common.name")}
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
            label={t("common.email")}
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
            label={t("common.password")}
            htmlFor="password"
            required
            hint={t("auth.validation.passwordHint")}
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
            {t("auth.register.continue")}
          </Button>
        </FormField>
      </form>
    </AuthCard>
  );
}
