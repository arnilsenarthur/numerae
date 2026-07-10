import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestIp } from "@/lib/request-ip";
import { rateLimit } from "@/lib/rate-limit";
import { verifySchema } from "@/lib/validators";

function rateLimitResponse(retryAfterMs: number | undefined) {
  const retryAfterSeconds = Math.max(1, Math.ceil((retryAfterMs ?? 60_000) / 1000));

  return NextResponse.json(
    {
      error: "Muitas tentativas. Aguarde alguns minutos.",
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}

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

    const ip = getRequestIp(request);
    const { email, code } = parsed.data;

    const ipLimit = rateLimit(`verify-ip:${ip}`, 40, 15 * 60 * 1000);
    if (!ipLimit.success) {
      return rateLimitResponse(ipLimit.retryAfterMs);
    }

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
      const failLimit = rateLimit(`verify-fail:${email}`, 15, 15 * 60 * 1000);
      if (!failLimit.success) {
        return rateLimitResponse(failLimit.retryAfterMs);
      }

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
