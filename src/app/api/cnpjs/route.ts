import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripCnpj, isValidCnpj } from "@/lib/cnpj";
import { prisma } from "@/lib/db";
import { findCnaePreset } from "@/modules/calculator/engines";
import { z } from "zod";

const createCnpjSchema = z.object({
  cnpj: z.string().min(1, "CNPJ obrigatório"),
  label: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(80),
  cnaeCode: z.string().optional(),
  cnaeDescription: z.string().optional(),
  taxRate: z.number().min(0).max(100),
  taxRegime: z.enum(["simples", "presumido", "manual"]).default("simples"),
  isDefault: z.boolean().optional(),
});

function serializeCnpj(record: {
  id: string;
  cnpj: string;
  label: string;
  cnaeCode: string | null;
  cnaeDescription: string | null;
  taxRegime: string;
  taxRate: { toNumber(): number } | number;
  isDefault: boolean;
}) {
  return {
    id: record.id,
    cnpj: record.cnpj,
    label: record.label,
    cnaeCode: record.cnaeCode,
    cnaeDescription: record.cnaeDescription,
    taxRegime: record.taxRegime,
    taxRate:
      typeof record.taxRate === "number" ? record.taxRate : record.taxRate.toNumber(),
    isDefault: record.isDefault,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const cnpjs = await prisma.userCnpj.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { label: "asc" }],
  });

  return NextResponse.json({ cnpjs: cnpjs.map(serializeCnpj) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createCnpjSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 },
      );
    }

    const digits = stripCnpj(parsed.data.cnpj);
    if (!isValidCnpj(digits)) {
      return NextResponse.json({ error: "CNPJ inválido." }, { status: 400 });
    }

    const preset = parsed.data.cnaeCode ? findCnaePreset(parsed.data.cnaeCode) : undefined;
    const cnaeDescription =
      parsed.data.cnaeDescription ?? preset?.description ?? null;

    if (parsed.data.isDefault) {
      await prisma.userCnpj.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });
    }

    const existingCount = await prisma.userCnpj.count({
      where: { userId: session.user.id },
    });

    const record = await prisma.userCnpj.upsert({
      where: {
        userId_cnpj: {
          userId: session.user.id,
          cnpj: digits,
        },
      },
      create: {
        userId: session.user.id,
        cnpj: digits,
        label: parsed.data.label,
        cnaeCode: preset?.code ?? parsed.data.cnaeCode ?? null,
        cnaeDescription,
        taxRegime: parsed.data.taxRegime,
        taxRate: parsed.data.taxRate,
        isDefault: parsed.data.isDefault ?? existingCount === 0,
      },
      update: {
        label: parsed.data.label,
        cnaeCode: preset?.code ?? parsed.data.cnaeCode ?? null,
        cnaeDescription,
        taxRegime: parsed.data.taxRegime,
        taxRate: parsed.data.taxRate,
        ...(parsed.data.isDefault ? { isDefault: true } : {}),
      },
    });

    return NextResponse.json({ cnpj: serializeCnpj(record) });
  } catch {
    return NextResponse.json({ error: "Erro ao salvar CNPJ." }, { status: 500 });
  }
}
