import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(100).optional(),
});

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[PATCH /api/user]", error);
    return NextResponse.json({ error: "Erro ao atualizar usuário." }, { status: 500 });
  }
}
