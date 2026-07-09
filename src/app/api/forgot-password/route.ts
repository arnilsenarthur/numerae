import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPasswordResetCode } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { forgotPasswordSchema } from "@/lib/validators";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 },
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const limit = rateLimit(`forgot-password:${ip}`, 5, 60 * 60 * 1000);

    if (!limit.success) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente mais tarde." },
        { status: 429 },
      );
    }

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user?.emailVerified || !user.active) {
      return NextResponse.json({
        success: true,
        message: "Se o e-mail existir, enviaremos um código de redefinição.",
      });
    }

    const code = generateCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.$transaction([
      prisma.passwordReset.deleteMany({ where: { email } }),
      prisma.passwordReset.create({
        data: { email, code, expires },
      }),
    ]);

    const emailResult = await sendPasswordResetCode(email, code, request);

    if (!emailResult.sent) {
      return NextResponse.json({ error: emailResult.error }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      message: "Código enviado para seu e-mail.",
    });
  } catch {
    return NextResponse.json(
      { error: "Erro ao solicitar redefinição de senha." },
      { status: 500 },
    );
  }
}
