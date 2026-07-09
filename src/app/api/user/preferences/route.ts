import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { userPreferenceSchema } from "@/lib/validators-budget";
import type { SerializedUserPreference } from "@/types/preferences";

function serializePreference(record: {
  userId: string;
  showDailyTip: boolean;
  defaultCurrency: string;
  language: string;
  updatedAt: Date;
}): SerializedUserPreference {
  return {
    userId: record.userId,
    showDailyTip: record.showDailyTip,
    defaultCurrency: record.defaultCurrency,
    language: record.language,
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const record = await prisma.userPreference.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id },
      update: {},
    });

    return NextResponse.json({ preference: serializePreference(record) });
  } catch (error) {
    console.error("[GET /api/user/preferences]", error);
    return NextResponse.json({ error: "Erro ao carregar preferências." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = userPreferenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const record = await prisma.userPreference.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...parsed.data,
      },
      update: parsed.data,
    });

    return NextResponse.json({ preference: serializePreference(record) });
  } catch (error) {
    console.error("[PUT /api/user/preferences]", error);
    return NextResponse.json({ error: "Erro ao salvar preferências." }, { status: 500 });
  }
}
