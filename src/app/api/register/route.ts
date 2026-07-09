import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendVerificationCode } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { resolveBootstrapRole } from "@/lib/user-roles";
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
      if (!existing.active) {
        return NextResponse.json(
          { error: "Esta conta está desativada. Entre em contato com o suporte." },
          { status: 403 },
        );
      }

      return NextResponse.json(
        { error: "Este e-mail já está cadastrado." },
        { status: 409 },
      );
    }

    if (existing && !existing.active) {
      return NextResponse.json(
        { error: "Esta conta está desativada. Entre em contato com o suporte." },
        { status: 403 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const code = generateCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    // Envia o e-mail antes de persistir — evita conta criada sem código entregue.
    const emailResult = await sendVerificationCode(email, code, request);

    if (!emailResult.sent) {
      return NextResponse.json({ error: emailResult.error }, { status: 503 });
    }

    await prisma.$transaction([
      prisma.user.upsert({
        where: { email },
        create: {
          name,
          email,
          passwordHash,
          role: resolveBootstrapRole(email),
        },
        update: {
          name,
          passwordHash,
        },
      }),
      prisma.emailVerification.deleteMany({ where: { email } }),
      prisma.emailVerification.create({
        data: { email, code, expires },
      }),
    ]);

    return NextResponse.json({
      success: true,
      email,
      message: "Enviamos um código de verificação para seu e-mail.",
    });
  } catch (error) {
    console.error("[POST /api/register]", error);
    return NextResponse.json(
      { error: "Erro ao criar conta. Tente novamente." },
      { status: 500 },
    );
  }
}
