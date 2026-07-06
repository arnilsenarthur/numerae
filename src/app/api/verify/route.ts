import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { verifySchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 },
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const limit = rateLimit(`verify:${ip}`, 10, 15 * 60 * 1000);

    if (!limit.success) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde alguns minutos." },
        { status: 429 },
      );
    }

    const { email, code } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json(
        { error: "Conta não encontrada." },
        { status: 404 },
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Este e-mail já foi verificado. Faça login." },
        { status: 409 },
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { error: "Esta conta está desativada. Entre em contato com o suporte." },
        { status: 403 },
      );
    }

    const verification = await prisma.emailVerification.findFirst({
      where: {
        email,
        code,
        expires: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Código inválido ou expirado." },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { emailVerified: new Date() },
      }),
      prisma.emailVerification.deleteMany({ where: { email } }),
    ]);

    return NextResponse.json({
      success: true,
      message: "E-mail verificado com sucesso.",
    });
  } catch {
    return NextResponse.json(
      { error: "Erro ao verificar código. Tente novamente." },
      { status: 500 },
    );
  }
}
