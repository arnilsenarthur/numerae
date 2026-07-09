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
import { validateFormFields } from "@/lib/form-validation";
import { useT } from "@/i18n/locale-provider";

export function LoginForm() {
  const t = useT();
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
    requiredMessage: t("auth.login.passwordRequired"),
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

    if (!validateFormFields([emailField, passwordField], event.currentTarget)) return;

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
        setError(t("auth.login.accountDisabled"));
        return;
      }

      setError(t("auth.login.wrongCredentials"));
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <AuthCard
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
      footer={
        <>
          {t("auth.login.noAccount")}{" "}
          <Link href="/register" className={authLinkClass}>
            {t("auth.login.createAccount")}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {disabled ? (
          <Alert variant="error">{t("auth.login.accountDisabled")}</Alert>
        ) : null}

        {verified ? (
          <Alert variant="success">{t("auth.login.verifiedSuccess")}</Alert>
        ) : null}

        {reset ? <Alert variant="success">{t("auth.login.resetSuccess")}</Alert> : null}

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

        <FormField delay={140}>
          <Field
            label={t("common.password")}
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

        <FormField delay={200}>
          <Button type="submit" className="w-full" loading={loading}>
            {t("auth.login.submit")}
          </Button>
        </FormField>

        <p className="text-center text-sm">
          <Link href="/forgot-password" className={authLinkClass}>
            {t("auth.login.forgotPassword")}
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
