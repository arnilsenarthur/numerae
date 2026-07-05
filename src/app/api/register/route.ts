import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendVerificationCode } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validators";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 },
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const limit = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);

    if (!limit.success) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente mais tarde." },
        { status: 429 },
      );
    }

    const { name, email, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing?.emailVerified) {
      return NextResponse.json(
        { error: "Este e-mail já está cadastrado." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const code = generateCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.$transaction([
      prisma.user.upsert({
        where: { email },
        create: { name, email, passwordHash },
        update: { name, passwordHash, emailVerified: null },
      }),
      prisma.emailVerification.deleteMany({ where: { email } }),
      prisma.emailVerification.create({
        data: { email, code, expires },
      }),
    ]);

    const emailResult = await sendVerificationCode(email, code);

    return NextResponse.json({
      success: true,
      email,
      message: emailResult.sent
        ? "Enviamos um código de verificação para seu e-mail."
        : "Conta criada. Verifique seu e-mail (ou use o código exibido em desenvolvimento).",
      devCode: emailResult.devCode,
    });
  } catch {
    return NextResponse.json(
      { error: "Erro ao criar conta. Tente novamente." },
      { status: 500 },
    );
  }
}
