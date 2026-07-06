import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendVerificationCode } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { resendCodeSchema } from "@/lib/validators";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resendCodeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 },
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const limit = rateLimit(`resend:${ip}`, 3, 15 * 60 * 1000);

    if (!limit.success) {
      return NextResponse.json(
        { error: "Aguarde antes de solicitar outro código." },
        { status: 429 },
      );
    }

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.emailVerified || !user.active) {
      return NextResponse.json({
        success: true,
        message: "Se o e-mail existir, enviaremos um novo código.",
      });
    }

    const code = generateCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.$transaction([
      prisma.emailVerification.deleteMany({ where: { email } }),
      prisma.emailVerification.create({
        data: { email, code, expires },
      }),
    ]);

    const emailResult = await sendVerificationCode(email, code);

    if (!emailResult.sent) {
      return NextResponse.json({ error: emailResult.error }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      message: "Novo código enviado para seu e-mail.",
    });
  } catch {
    return NextResponse.json(
      { error: "Erro ao reenviar código." },
      { status: 500 },
    );
  }
}
