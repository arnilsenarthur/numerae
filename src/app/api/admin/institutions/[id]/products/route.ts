import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { ADMIN_ENTITY, logAdminAction, toAuditSnapshot } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/admin-auth";
import { slugifyInstitution } from "@/lib/institutions";
import { serializeInstitutionProduct } from "@/lib/product-serializer";
import { institutionProductSchema } from "@/lib/validators-institutions";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await context.params;

  const institution = await prisma.institution.findUnique({ where: { id } });
  if (!institution) {
    return NextResponse.json({ error: "Instituição não encontrada." }, { status: 404 });
  }

  const products = await prisma.institutionProduct.findMany({
    where: { institutionId: id },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({
    products: products.map(serializeInstitutionProduct),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await context.params;

  try {
    const institution = await prisma.institution.findUnique({ where: { id } });
    if (!institution) {
      return NextResponse.json({ error: "Instituição não encontrada." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = institutionProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const slug = parsed.data.slug || slugifyInstitution(parsed.data.name);

    const record = await prisma.institutionProduct.create({
      data: {
        institutionId: id,
        name: parsed.data.name,
        slug,
        kind: parsed.data.kind,
        currencyCode: parsed.data.currencyCode || null,
        description: parsed.data.description || null,
        active: parsed.data.active ?? true,
      },
    });

    await logAdminAction({
      userId: admin.session.user.id,
      action: "CREATE",
      entityType: ADMIN_ENTITY.INSTITUTION_PRODUCT,
      entityId: record.id,
      entityLabel: record.name,
      parentType: ADMIN_ENTITY.INSTITUTION,
      parentId: id,
      after: toAuditSnapshot(record),
    });

    return NextResponse.json({ product: serializeInstitutionProduct(record) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Slug já em uso nesta instituição." }, { status: 409 });
    }

    return NextResponse.json({ error: "Erro ao criar produto." }, { status: 500 });
  }
}
