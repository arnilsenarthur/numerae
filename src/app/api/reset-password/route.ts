import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { resetPasswordSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 },
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const limit = rateLimit(`reset-password:${ip}`, 10, 15 * 60 * 1000);

    if (!limit.success) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde alguns minutos." },
        { status: 429 },
      );
    }

    const { email, code, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user?.emailVerified || !user.active) {
      return NextResponse.json(
        { error: "Conta não encontrada." },
        { status: 404 },
      );
    }

    const reset = await prisma.passwordReset.findFirst({
      where: {
        email,
        code,
        expires: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!reset) {
      return NextResponse.json(
        { error: "Código inválido ou expirado." },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { passwordHash },
      }),
      prisma.passwordReset.deleteMany({ where: { email } }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Senha redefinida com sucesso.",
    });
  } catch {
    return NextResponse.json(
      { error: "Erro ao redefinir senha. Tente novamente." },
      { status: 500 },
    );
  }
}
