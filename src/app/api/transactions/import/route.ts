import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type CsvMapping = {
  date: string;
  description: string;
  amount: string;
  kind?: string;
  category?: string;
};

type ParsedRow = {
  date: string;
  description: string;
  amount: number;
  kind: "INCOME" | "EXPENSE";
  category: string;
  valid: boolean;
  error?: string;
};

function parseAmount(raw: string): number {
  if (!raw) return NaN;
  const cleaned = raw.trim().replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned);
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  // Try ISO first
  const iso = new Date(raw);
  if (!isNaN(iso.getTime())) return iso;
  // Try dd/mm/yyyy
  const parts = raw.split(/[/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    // dd/mm/yyyy
    if (a && b && c && a.length <= 2 && b.length <= 2 && c.length === 4) {
      const d = new Date(`${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`);
      if (!isNaN(d.getTime())) return d;
    }
    // yyyy-mm-dd already tried above
  }
  return null;
}

function parseCsvText(csvText: string, mapping: CsvMapping, accountCurrency: string): ParsedRow[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = lines[0]!.split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
  const dataLines = lines.slice(1);

  const colIndex = (name: string) => {
    const idx = header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
    return idx;
  };

  const dateCol = colIndex(mapping.date);
  const descCol = colIndex(mapping.description);
  const amountCol = colIndex(mapping.amount);
  const kindCol = mapping.kind ? colIndex(mapping.kind) : -1;
  const catCol = mapping.category ? colIndex(mapping.category) : -1;

  return dataLines.map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));

    const rawDate = cols[dateCol] ?? "";
    const rawDesc = cols[descCol] ?? "";
    const rawAmount = cols[amountCol] ?? "";
    const rawKind = kindCol >= 0 ? (cols[kindCol] ?? "") : "";
    const rawCat = catCol >= 0 ? (cols[catCol] ?? "") : "";

    const parsedDate = parseDate(rawDate);
    const parsedAmount = parseAmount(rawAmount);

    if (!parsedDate) {
      return { date: rawDate, description: rawDesc, amount: 0, kind: "EXPENSE" as const, category: rawCat || "other", valid: false, error: "Data inválida" };
    }
    if (isNaN(parsedAmount) || parsedAmount === 0) {
      return { date: parsedDate.toISOString(), description: rawDesc, amount: 0, kind: "EXPENSE" as const, category: rawCat || "other", valid: false, error: "Valor inválido" };
    }

    let kind: "INCOME" | "EXPENSE" = parsedAmount > 0 ? "INCOME" : "EXPENSE";
    if (rawKind) {
      const k = rawKind.toLowerCase();
      if (k === "income" || k === "entrada" || k === "receita" || k === "credito" || k === "crédito") kind = "INCOME";
      else if (k === "expense" || k === "saida" || k === "saída" || k === "despesa" || k === "debito" || k === "débito") kind = "EXPENSE";
    }

    return {
      date: parsedDate.toISOString(),
      description: rawDesc || "Importado",
      amount: Math.abs(parsedAmount),
      kind,
      category: rawCat || "other",
      valid: true,
    };
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mappingRaw = formData.get("mapping") as string | null;
    const accountId = formData.get("accountId") as string | null;
    const confirm = formData.get("confirm") === "true";

    if (!file || !mappingRaw || !accountId) {
      return NextResponse.json({ error: "Arquivo, mapeamento e conta são obrigatórios." }, { status: 400 });
    }

    const mapping: CsvMapping = JSON.parse(mappingRaw);

    const account = await prisma.financialAccount.findFirst({
      where: { id: accountId, userId: session.user.id },
    });
    if (!account) {
      return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
    }

    const csvText = await file.text();
    const rows = parseCsvText(csvText, mapping, account.currencyCode);
    const validRows = rows.filter((r) => r.valid);

    if (!confirm) {
      // Preview mode — return first 10 rows and total count
      return NextResponse.json({
        preview: rows.slice(0, 10),
        total: rows.length,
        valid: validRows.length,
        invalid: rows.length - validRows.length,
      });
    }

    // Confirm mode — insert all valid rows
    await prisma.transaction.createMany({
      data: validRows.map((row) => ({
        userId: session.user.id,
        accountId,
        kind: row.kind,
        amount: row.amount,
        currencyCode: account.currencyCode,
        category: row.category,
        description: row.description,
        date: new Date(row.date),
        counterAccountId: null,
        counterAmount: null,
        planEntryId: null,
        recurringId: null,
        notes: "Importado via CSV",
      })),
    });

    return NextResponse.json({ imported: validRows.length });
  } catch (error) {
    console.error("[POST /api/transactions/import]", error);
    return NextResponse.json({ error: "Erro ao importar transações." }, { status: 500 });
  }
}
