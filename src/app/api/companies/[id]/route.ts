import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serializeCompany } from "@/lib/company-serializer";
import { prisma } from "@/lib/db";
import { findCnaePreset } from "@/modules/calculator/engines";
import {
  defaultRegistrationKind,
  normalizeRegistrationId,
  updateCompanySchema,
} from "@/lib/validators-company";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.userCompany.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateCompanySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const countryCode = parsed.data.countryCode ?? existing.countryCode;
    const registrationKind =
      parsed.data.registrationKind ??
      existing.registrationKind ??
      defaultRegistrationKind(countryCode);
    const registrationId = parsed.data.registrationId
      ? normalizeRegistrationId(parsed.data.registrationId, registrationKind)
      : existing.registrationId;

    if (parsed.data.isDefault) {
      await prisma.userCompany.updateMany({
        where: { userId: session.user.id, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const preset = parsed.data.activityCode ? findCnaePreset(parsed.data.activityCode) : undefined;

    const record = await prisma.userCompany.update({
      where: { id },
      data: {
        ...(parsed.data.countryCode ? { countryCode: parsed.data.countryCode } : {}),
        ...(parsed.data.label ? { label: parsed.data.label } : {}),
        ...(parsed.data.legalName !== undefined ? { legalName: parsed.data.legalName } : {}),
        ...(parsed.data.registrationId ? { registrationId } : {}),
        ...(parsed.data.registrationKind ? { registrationKind: parsed.data.registrationKind } : {}),
        ...(parsed.data.activityCode !== undefined
          ? {
              activityCode: preset?.code ?? parsed.data.activityCode,
              activityDescription:
                parsed.data.activityDescription ??
                preset?.description ??
                existing.activityDescription,
            }
          : parsed.data.activityDescription !== undefined
            ? { activityDescription: parsed.data.activityDescription }
            : {}),
        ...(parsed.data.taxRegime ? { taxRegime: parsed.data.taxRegime } : {}),
        ...(parsed.data.taxRate !== undefined ? { taxRate: parsed.data.taxRate } : {}),
        ...(parsed.data.isDefault !== undefined ? { isDefault: parsed.data.isDefault } : {}),
      },
    });

    return NextResponse.json({ company: serializeCompany(record) });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar empresa." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.userCompany.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
  }

  await prisma.userCompany.delete({ where: { id } });

  if (existing.isDefault) {
    const next = await prisma.userCompany.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    });

    if (next) {
      await prisma.userCompany.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
