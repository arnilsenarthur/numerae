import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeAccount } from "@/lib/finance-serializer";
import { updateAccountSchema } from "@/lib/validators-finance";

const INSTITUTION_ACCOUNT_SELECT = {
  name: true,
  logoUrl: true,
  type: true,
  brandColor: true,
} as const;

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = updateAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const existing = await prisma.financialAccount.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
    }

    if (parsed.data.isDefault) {
      await prisma.financialAccount.updateMany({
        where: { userId: session.user.id, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const record = await prisma.financialAccount.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.kind !== undefined ? { kind: parsed.data.kind } : {}),
        ...(parsed.data.currencyCode !== undefined
          ? { currencyCode: parsed.data.currencyCode }
          : {}),
        ...(parsed.data.countryCode !== undefined
          ? { countryCode: parsed.data.countryCode }
          : {}),
        ...(parsed.data.institutionId !== undefined
          ? { institutionId: parsed.data.institutionId || null }
          : {}),
        ...(parsed.data.initialBalance !== undefined
          ? { initialBalance: parsed.data.initialBalance }
          : {}),
        ...(parsed.data.color !== undefined ? { color: parsed.data.color ?? null } : {}),
        ...(parsed.data.icon !== undefined ? { icon: parsed.data.icon ?? null } : {}),
        ...(parsed.data.archived !== undefined ? { archived: parsed.data.archived } : {}),
        ...(parsed.data.creditLimit !== undefined
          ? { creditLimit: parsed.data.creditLimit ?? null }
          : {}),
        ...(parsed.data.isDefault !== undefined ? { isDefault: parsed.data.isDefault } : {}),
      },
      include: { institution: { select: INSTITUTION_ACCOUNT_SELECT } },
    });

    return NextResponse.json({ account: serializeAccount(record) });
  } catch (error) {
    console.error("[PATCH /api/accounts/[id]]", error);
    return NextResponse.json({ error: "Erro ao atualizar conta." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const existing = await prisma.financialAccount.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
    }

    await prisma.financialAccount.delete({ where: { id } });

    if (existing.isDefault) {
      const next = await prisma.financialAccount.findFirst({
        where: { userId: session.user.id, archived: false },
        orderBy: { createdAt: "asc" },
      });

      if (next) {
        await prisma.financialAccount.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/accounts/[id]]", error);
    return NextResponse.json({ error: "Erro ao excluir conta." }, { status: 500 });
  }
}
