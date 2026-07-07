import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serializeCompany } from "@/lib/company-serializer";
import { prisma } from "@/lib/db";
import { findCnaePreset } from "@/modules/calculator/engines";
import {
  createCompanySchema,
  defaultRegistrationKind,
  normalizeRegistrationId,
} from "@/lib/validators-company";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const countryCode = searchParams.get("countryCode")?.trim().toUpperCase();

  try {
    const companies = await prisma.userCompany.findMany({
      where: {
        userId: session.user.id,
        ...(countryCode ? { countryCode } : {}),
      },
      orderBy: [{ isDefault: "desc" }, { label: "asc" }],
    });

    return NextResponse.json({ companies: companies.map(serializeCompany) });
  } catch (error) {
    console.error("[GET /api/companies]", error);
    return NextResponse.json({ error: "Erro ao carregar empresas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createCompanySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const registrationKind = parsed.data.registrationKind ?? defaultRegistrationKind(parsed.data.countryCode);
    const registrationId = normalizeRegistrationId(parsed.data.registrationId, registrationKind);

    const preset = parsed.data.activityCode ? findCnaePreset(parsed.data.activityCode) : undefined;
    const activityDescription =
      parsed.data.activityDescription ?? preset?.description ?? null;

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
          countryCode: parsed.data.countryCode,
          registrationId,
        },
      },
      create: {
        userId: session.user.id,
        countryCode: parsed.data.countryCode,
        label: parsed.data.label,
        legalName: parsed.data.legalName ?? null,
        registrationId,
        registrationKind,
        activityCode: preset?.code ?? parsed.data.activityCode ?? null,
        activityDescription,
        taxRegime: parsed.data.taxRegime,
        taxRate: parsed.data.taxRate,
        isDefault: parsed.data.isDefault ?? existingCount === 0,
      },
      update: {
        label: parsed.data.label,
        legalName: parsed.data.legalName ?? null,
        registrationKind,
        activityCode: preset?.code ?? parsed.data.activityCode ?? null,
        activityDescription,
        taxRegime: parsed.data.taxRegime,
        taxRate: parsed.data.taxRate,
        ...(parsed.data.isDefault ? { isDefault: true } : {}),
      },
    });

    return NextResponse.json({ company: serializeCompany(record) });
  } catch {
    return NextResponse.json({ error: "Erro ao salvar empresa." }, { status: 500 });
  }
}
