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
import { useT } from "@/i18n/locale-provider";

function VerifyMissingEmail() {
  const t = useT();

  return (
    <AuthCard
      title={t("auth.verify.title")}
      subtitle={t("auth.verify.missingSubtitle")}
      footer={
        <>
          <Link href="/register" className={authLinkClass}>
            {t("auth.createAccount")}
          </Link>
          {" · "}
          <Link href="/login" className={authLinkClass}>
            {t("auth.login.submit")}
          </Link>
        </>
      }
    >
      <Alert variant="warning">{t("auth.verify.missingWarning")}</Alert>
    </AuthCard>
  );
}

export function VerifyForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const {
    cooldown: resendCooldown,
    startCooldown: startResendCooldown,
    canResend,
  } = useResendCooldown(60);
  const {
    cooldown: verifyCooldown,
    startCooldown: startVerifyCooldown,
    canResend: canVerify,
  } = useResendCooldown(0);
  const submitLock = useRef(false);
  const lastSubmittedCode = useRef<string | null>(null);

  const verifyCode = useCallback(
    async (nextCode: string) => {
      if (
        !email ||
        nextCode.length !== 6 ||
        !canVerify ||
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

          if (response.status === 429) {
            const seconds = data.retryAfterSeconds ?? 120;
            startVerifyCooldown(seconds);
            setError(t("auth.verify.errorRateLimit", { seconds }));
            return;
          }

          setError(data.error ?? t("auth.verify.errorVerify"));
          return;
        }

        setMessage(t("auth.verify.verifiedSigningIn"));

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
    [canVerify, email, router, startVerifyCooldown, t],
  );

  useEffect(() => {
    if (code.length !== 6 || loading || resending || !canVerify) return;

    const timer = window.setTimeout(() => {
      void verifyCode(code);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [canVerify, code, loading, resending, verifyCode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (code.length !== 6) {
      setCodeError(t("auth.validation.codeSixDigits"));
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
      setError(data.error ?? t("auth.verify.errorResend"));
      if (response.status === 429) startResendCooldown();
      return;
    }

    setMessage(data.message);
    setCode("");
    setCodeError(null);
    lastSubmittedCode.current = null;
    startResendCooldown();
  }

  if (!email) {
    return <VerifyMissingEmail />;
  }

  return (
    <AuthCard
      title={t("auth.verify.title")}
      subtitle={t("auth.verify.subtitleSent", { email: maskEmail(email) })}
      step={{
        current: 2,
        total: 2,
        labels: [t("auth.verify.stepAccount"), t("auth.verify.stepVerify")],
      }}
      footer={
        <Link href="/login" className={authLinkClass}>
          {t("auth.verify.backToLogin")}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <FormField delay={80}>
          <Field
            label={t("auth.verify.codeLabel")}
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
                disabled={loading || !canVerify}
              />
            </div>
          </Field>
        </FormField>

        <p className="text-center text-xs text-zinc-500">{t("auth.verify.codeExpiry")}</p>

        {verifyCooldown > 0 ? (
          <Alert variant="warning">
            {t("auth.verify.waitToVerify", { seconds: verifyCooldown })}
          </Alert>
        ) : null}
        {error ? <Alert variant="error">{error}</Alert> : null}
        {message ? <Alert variant="success">{message}</Alert> : null}

        <FormField delay={160}>
          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={code.length !== 6 || !canVerify}
          >
            {t("auth.verify.submit")}
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
            {canResend
              ? t("auth.verify.resend")
              : t("auth.verify.resendIn", { seconds: resendCooldown })}
          </Button>
        </FormField>
      </form>
    </AuthCard>
  );
}
