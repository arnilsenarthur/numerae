import { Resend } from "resend";
import { SITE_NAME } from "@/lib/site";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const fromAddress =
  process.env.EMAIL_FROM ?? "Numerae <onboarding@resend.dev>";

type SendResult =
  | { sent: true }
  | { sent: false; error: string; code?: "domain_not_verified" | "not_configured" };

function mapResendError(error: { message?: string | null; name?: string; statusCode?: number | null }): SendResult {
  const message = error.message ?? "";

  if (
    message.includes("only send testing emails") ||
    message.includes("verify a domain")
  ) {
    return {
      sent: false,
      code: "domain_not_verified",
      error:
        "O envio de e-mail em produção ainda não está liberado. Verifique um domínio no Resend (resend.com/domains) e configure EMAIL_FROM com esse domínio.",
    };
  }

  return {
    sent: false,
    error: "Não foi possível enviar o e-mail. Tente novamente em instantes.",
  };
}

type EmailTemplateOptions = {
  heading: string;
  paragraphs: string[];
  code: string;
  codeLabel: string;
  footer: string;
};

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

export async function sendVerificationCode(
  email: string,
  code: string,
): Promise<SendResult> {
  if (!resend) {
    return {
      sent: false,
      code: "not_configured",
      error: "Serviço de e-mail não configurado.",
    };
  }

  const subject = `Confirme seu e-mail — ${SITE_NAME}`;
  const html = buildEmailHtml({
    heading: "Bem-vindo ao Numerae",
    paragraphs: [
      "Obrigado por criar sua conta. Antes de acessar o painel, precisamos confirmar que este endereço de e-mail é seu.",
      "Digite o código abaixo na tela de verificação. Depois disso você poderá entrar, cadastrar contas, registrar lançamentos e acompanhar suas metas.",
    ],
    codeLabel: "Código de verificação",
    code,
    footer:
      "Este código expira em 15 minutos. Se você não solicitou o cadastro, pode ignorar este e-mail com segurança.",
  });

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: email,
    subject,
    html,
  });

  if (error) {
    console.error("[Numerae] Erro ao enviar e-mail:", error);
    return mapResendError(error);
  }

  return { sent: true };
}

export async function sendPasswordResetCode(
  email: string,
  code: string,
): Promise<SendResult> {
  if (!resend) {
    return {
      sent: false,
      code: "not_configured",
      error: "Serviço de e-mail não configurado.",
    };
  }

  const subject = `Redefinir senha — ${SITE_NAME}`;
  const html = buildEmailHtml({
    heading: "Redefinição de senha",
    paragraphs: [
      "Recebemos um pedido para alterar a senha da sua conta no Numerae.",
      "Use o código abaixo na página de redefinição. Ao concluir, faça login com a nova senha para voltar ao painel.",
    ],
    codeLabel: "Código de redefinição",
    code,
    footer:
      "Este código expira em 15 minutos. Se você não pediu para redefinir a senha, ignore este e-mail — sua conta permanece protegida.",
  });

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: email,
    subject,
    html,
  });

  if (error) {
    console.error("[Numerae] Erro ao enviar e-mail de redefinição:", error);
    return mapResendError(error);
  }

  return { sent: true };
}
