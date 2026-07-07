import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serializeCompanyAsCnpj } from "@/lib/company-serializer";
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

/** Legacy endpoint — retorna empresas brasileiras no formato antigo de CNPJ. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const companies = await prisma.userCompany.findMany({
    where: { userId: session.user.id, countryCode: "BR" },
    orderBy: [{ isDefault: "desc" }, { label: "asc" }],
  });

  return NextResponse.json({ cnpjs: companies.map(serializeCompanyAsCnpj) });
}

/** Legacy endpoint — cadastra empresa BR (CNPJ). */
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
    const activityDescription =
      parsed.data.cnaeDescription ?? preset?.description ?? null;

    if (parsed.data.isDefault) {
      await prisma.userCompany.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });
    }

    const existingCount = await prisma.userCompany.count({
      where: { userId: session.user.id },
    });

    const record = await prisma.userCompany.upsert({
      where: {
        userId_countryCode_registrationId: {
          userId: session.user.id,
          countryCode: "BR",
          registrationId: digits,
        },
      },
      create: {
        userId: session.user.id,
        countryCode: "BR",
        label: parsed.data.label,
        registrationId: digits,
        registrationKind: "CNPJ",
        activityCode: preset?.code ?? parsed.data.cnaeCode ?? null,
        activityDescription,
        taxRegime: parsed.data.taxRegime,
        taxRate: parsed.data.taxRate,
        isDefault: parsed.data.isDefault ?? existingCount === 0,
      },
      update: {
        label: parsed.data.label,
        activityCode: preset?.code ?? parsed.data.cnaeCode ?? null,
        activityDescription,
        taxRegime: parsed.data.taxRegime,
        taxRate: parsed.data.taxRate,
        ...(parsed.data.isDefault ? { isDefault: true } : {}),
      },
    });

    return NextResponse.json({ cnpj: serializeCompanyAsCnpj(record) });
  } catch {
    return NextResponse.json({ error: "Erro ao salvar CNPJ." }, { status: 500 });
  }
}
