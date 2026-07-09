import nodemailer from "nodemailer";
import { Resend } from "resend";
import { createTranslator } from "@/i18n/translate";
import { resolveLocaleFromRequest } from "@/i18n/request-locale";
import { resolveAppLocale, type AppLocale } from "@/i18n/locales";
import { SITE_NAME } from "@/lib/site";

type SendResult =
  | { sent: true }
  | { sent: false; error: string; code?: "domain_not_verified" | "not_configured" };

type EmailTemplateOptions = {
  heading: string;
  paragraphs: string[];
  code: string;
  codeLabel: string;
  footer: string;
  footerReason: string;
};

const smtpUser = process.env.SMTP_USER?.trim();
const smtpPass = process.env.SMTP_PASS?.trim();
const emailFrom = process.env.EMAIL_FROM?.trim();

function resolveSmtpHost(user: string | undefined): string {
  const explicit = process.env.SMTP_HOST?.trim();
  if (explicit) return explicit;

  const domain = user?.split("@")[1]?.toLowerCase() ?? "";
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return "smtp.gmail.com";
  }
  if (
    domain === "outlook.com" ||
    domain === "outlook.com.br" ||
    domain === "hotmail.com" ||
    domain === "hotmail.com.br" ||
    domain === "live.com" ||
    domain === "msn.com"
  ) {
    return "smtp-mail.outlook.com";
  }

  return "smtp.gmail.com";
}

const smtpHost = resolveSmtpHost(smtpUser);
const smtpPort = Number(process.env.SMTP_PORT) || 587;

const useSmtp = Boolean(smtpUser && smtpPass);
const resend = !useSmtp && process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const EMAIL_MODE = (process.env.EMAIL_MODE ?? "test").trim().toLowerCase();
const isResendTestMode = EMAIL_MODE !== "production";

const resendFromAddress = isResendTestMode
  ? "Numerae <onboarding@resend.dev>"
  : emailFrom && !emailFrom.includes("resend.dev")
    ? emailFrom
    : null;

const smtpFromAddress = emailFrom ?? (smtpUser ? `Numerae <${smtpUser}>` : null);

const smtpTransport = useSmtp
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser!, pass: smtpPass! },
      requireTLS: smtpPort === 587,
    })
  : null;

if (!useSmtp && !resend) {
  console.warn(
    "[Numerae] E-mail não configurado. Defina SMTP_USER/SMTP_PASS (Gmail) ou RESEND_API_KEY.",
  );
}

function mapResendError(
  error: { message?: string | null; name?: string; statusCode?: number | null },
  options: { testMode: boolean },
  t: ReturnType<typeof createTranslator>,
): SendResult {
  const message = error.message ?? "";

  if (
    message.includes("only send testing emails") ||
    message.includes("verify a domain")
  ) {
    if (options.testMode) {
      return {
        sent: false,
        code: "domain_not_verified",
        error: t("errors.email.testMode"),
      };
    }

    return {
      sent: false,
      code: "domain_not_verified",
      error: t("errors.email.domainNotVerified"),
    };
  }

  return {
    sent: false,
    error: t("errors.email.sendFailed"),
  };
}

function buildEmailHtml({
  heading,
  paragraphs,
  code,
  codeLabel,
  footer,
  footerReason,
}: EmailTemplateOptions) {
  const body = paragraphs
    .map(
      (paragraph) =>
        `<p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #3f3f46;">${paragraph}</p>`,
    )
    .join("");

  return `
    <div style="margin: 0; padding: 32px 16px; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden;">
        <div style="padding: 28px 28px 20px; border-bottom: 1px solid #f4f4f5;">
          <p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #059669;">${SITE_NAME}</p>
          <h1 style="margin: 0; font-size: 22px; font-weight: 600; line-height: 1.3; color: #18181b;">${heading}</h1>
        </div>
        <div style="padding: 24px 28px 8px;">
          ${body}
          <p style="margin: 0 0 8px; font-size: 13px; font-weight: 500; color: #71717a;">${codeLabel}</p>
          <div style="margin: 0 0 20px; padding: 16px 20px; border-radius: 12px; background: #f4f4f5; text-align: center;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 0.35em; color: #18181b;">${code}</span>
          </div>
        </div>
        <div style="padding: 0 28px 28px;">
          <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #71717a;">${footer}</p>
        </div>
      </div>
      <p style="max-width: 520px; margin: 16px auto 0; text-align: center; font-size: 12px; color: #a1a1aa;">
        ${footerReason}
      </p>
    </div>
  `;
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  locale: AppLocale,
): Promise<SendResult> {
  const t = createTranslator(locale);

  if (useSmtp) {
    if (!smtpFromAddress) {
      return {
        sent: false,
        code: "not_configured",
        error: t("errors.email.smtpFromMissing"),
      };
    }

    try {
      await smtpTransport!.sendMail({
        from: smtpFromAddress,
        to,
        subject,
        html,
      });
      return { sent: true };
    } catch (error) {
      console.error("[Numerae] Erro ao enviar e-mail via SMTP:", error);
      const message =
        error instanceof Error && /auth|credentials|535|534/i.test(error.message)
          ? t("errors.email.smtpAuth")
          : t("errors.email.smtpFailed");
      return { sent: false, error: message };
    }
  }

  if (!resend) {
    return {
      sent: false,
      code: "not_configured",
      error: t("errors.email.notConfigured"),
    };
  }

  if (!resendFromAddress) {
    return {
      sent: false,
      code: "not_configured",
      error: t("errors.email.resendFromMissing"),
    };
  }

  const { error } = await resend.emails.send({
    from: resendFromAddress,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("[Numerae] Erro ao enviar e-mail:", error);
    return mapResendError(error, { testMode: isResendTestMode }, t);
  }

  return { sent: true };
}

export async function sendVerificationCode(
  email: string,
  code: string,
  localeInput?: AppLocale | Request,
): Promise<SendResult> {
  const locale =
    localeInput instanceof Request
      ? resolveLocaleFromRequest(localeInput)
      : resolveAppLocale(localeInput);
  const t = createTranslator(locale);

  return sendEmail(
    email,
    t("email.verification.subject", { siteName: SITE_NAME }),
    buildEmailHtml({
      heading: t("email.verification.heading"),
      paragraphs: [t("email.verification.p1"), t("email.verification.p2")],
      codeLabel: t("email.verification.codeLabel"),
      code,
      footer: t("email.verification.footer"),
      footerReason: t("email.footerReason", { siteName: SITE_NAME }),
    }),
    locale,
  );
}

export async function sendPasswordResetCode(
  email: string,
  code: string,
  localeInput?: AppLocale | Request,
): Promise<SendResult> {
  const locale =
    localeInput instanceof Request
      ? resolveLocaleFromRequest(localeInput)
      : resolveAppLocale(localeInput);
  const t = createTranslator(locale);

  return sendEmail(
    email,
    t("email.reset.subject", { siteName: SITE_NAME }),
    buildEmailHtml({
      heading: t("email.reset.heading"),
      paragraphs: [t("email.reset.p1"), t("email.reset.p2")],
      codeLabel: t("email.reset.codeLabel"),
      code,
      footer: t("email.reset.footer"),
      footerReason: t("email.footerReason", { siteName: SITE_NAME }),
    }),
    locale,
  );
}
