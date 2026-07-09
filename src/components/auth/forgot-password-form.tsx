"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authLinkClass, AuthCard } from "@/components/auth/auth-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, useValidatedField } from "@/components/ui/field";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { validationRules } from "@/components/ui/field-validation";
import { validateFormFields } from "@/lib/form-validation";
import { useT } from "@/i18n/locale-provider";

export function ForgotPasswordForm() {
  const t = useT();
  const router = useRouter();
  const emailField = useValidatedField([validationRules.email()], {
    required: true,
    showSuccess: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!validateFormFields([emailField], event.currentTarget)) return;

    setLoading(true);

    const response = await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailField.value.trim().toLowerCase() }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? t("auth.forgot.error"));
      return;
    }

    router.push(
      `/reset-password?email=${encodeURIComponent(emailField.value.trim().toLowerCase())}`,
    );
  }

  return (
    <AuthCard
      title={t("auth.forgot.title")}
      subtitle={t("auth.forgot.subtitle")}
      footer={
        <Link href="/login" className={authLinkClass}>
          {t("auth.forgot.backToLogin")}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert variant="error">{error}</Alert> : null}

        <FormField delay={80}>
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

        <FormField delay={160}>
          <Button type="submit" className="w-full" loading={loading}>
            {t("auth.forgot.submit")}
          </Button>
        </FormField>
      </form>
    </AuthCard>
  );
}
