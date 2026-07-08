import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const fromAddress =
  process.env.EMAIL_FROM ?? "Numerae <onboarding@resend.dev>";

type SendResult =
  | { sent: true }
  | { sent: false; error: string; code?: "domain_not_verified" | "not_configured" };

function mapResendError(error: { message?: string; name?: string; statusCode?: number }): SendResult {
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

  const subject = "Seu código de verificação — Numerae";
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #059669;">Numerae</h2>
      <p>Use o código abaixo para confirmar seu e-mail:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111;">${code}</p>
      <p style="color: #666; font-size: 14px;">Este código expira em 15 minutos.</p>
    </div>
  `;

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
