import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const fromAddress =
  process.env.EMAIL_FROM ?? "Numerae <onboarding@resend.dev>";

export async function sendVerificationCode(
  email: string,
  code: string,
): Promise<{ sent: boolean; devCode?: string }> {
  const subject = "Seu código de verificação — Numerae";
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #059669;">Numerae</h2>
      <p>Use o código abaixo para confirmar seu e-mail:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111;">${code}</p>
      <p style="color: #666; font-size: 14px;">Este código expira em 15 minutos.</p>
    </div>
  `;

  if (resend) {
    await resend.emails.send({
      from: fromAddress,
      to: email,
      subject,
      html,
    });
    return { sent: true };
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[Numerae] Código de verificação para ${email}: ${code}`);
  }

  return { sent: false, devCode: process.env.NODE_ENV === "development" ? code : undefined };
}
