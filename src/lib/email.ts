import nodemailer from "nodemailer";
import { Resend } from "resend";
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
      // Outlook/Hotmail exige STARTTLS na porta 587.
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
        error:
          "Modo teste do Resend ativo. Configure SMTP (Outlook/Gmail) ou verifique um domínio no Resend.",
      };
    }

    return {
      sent: false,
      code: "domain_not_verified",
      error:
        "Envio bloqueado no Resend. Verifique um domínio ou use SMTP (Outlook/Gmail).",
    };
  }

  return {
    sent: false,
    error: "Não foi possível enviar o e-mail. Tente novamente em instantes.",
  };
}

function buildEmailHtml({
  heading,
  paragraphs,
  code,
  codeLabel,
  footer,
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
        Você recebeu este e-mail porque há uma ação pendente na sua conta ${SITE_NAME}.
      </p>
    </div>
  `;
}

async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  if (useSmtp) {
    if (!smtpFromAddress) {
      return {
        sent: false,
        code: "not_configured",
        error: "Defina EMAIL_FROM ou SMTP_USER para envio por SMTP.",
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
          ? "Falha na autenticação SMTP. Use uma senha de app do Gmail (não a senha normal da conta)."
          : "Não foi possível enviar o e-mail. Verifique as credenciais SMTP.";
      return { sent: false, error: message };
    }
  }

  if (!resend) {
    return {
      sent: false,
      code: "not_configured",
      error: "Serviço de e-mail não configurado.",
    };
  }

  if (!resendFromAddress) {
    return {
      sent: false,
      code: "not_configured",
      error:
        "E-mail Resend em produção não configurado. Defina EMAIL_FROM com domínio verificado ou use SMTP.",
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
    return mapResendError(error, { testMode: isResendTestMode });
  }

  return { sent: true };
}

export async function sendVerificationCode(
  email: string,
  code: string,
): Promise<SendResult> {
  return sendEmail(
    email,
    `Confirme seu e-mail — ${SITE_NAME}`,
    buildEmailHtml({
      heading: "Bem-vindo ao Numerae",
      paragraphs: [
        "Obrigado por criar sua conta. Antes de acessar o painel, precisamos confirmar que este endereço de e-mail é seu.",
        "Digite o código abaixo na tela de verificação. Depois disso você poderá entrar, cadastrar contas, registrar lançamentos e acompanhar suas metas.",
      ],
      codeLabel: "Código de verificação",
      code,
      footer:
        "Este código expira em 15 minutos. Se você não solicitou o cadastro, pode ignorar este e-mail com segurança.",
    }),
  );
}

export async function sendPasswordResetCode(
  email: string,
  code: string,
): Promise<SendResult> {
  return sendEmail(
    email,
    `Redefinir senha — ${SITE_NAME}`,
    buildEmailHtml({
      heading: "Redefinição de senha",
      paragraphs: [
        "Recebemos um pedido para alterar a senha da sua conta no Numerae.",
        "Use o código abaixo na página de redefinição. Ao concluir, faça login com a nova senha para voltar ao painel.",
      ],
      codeLabel: "Código de redefinição",
      code,
      footer:
        "Este código expira em 15 minutos. Se você não pediu para redefinir a senha, ignore este e-mail — sua conta permanece protegida.",
    }),
  );
}
