import { findCnaePreset } from "@/modules/calculator/engines";

export type CnpjLookupResult = {
  cnpj: string;
  legalName: string;
  tradeName: string | null;
  cnaeCode: string;
  cnaeDescription: string;
  status: string;
  suggestedTaxRate: number;
  city: string | null;
  state: string | null;
};

type BrasilApiCnpjResponse = {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  cnae_fiscal?: number;
  cnae_fiscal_descricao?: string;
  descricao_situacao_cadastral?: string;
  municipio?: string;
  uf?: string;
};

export function formatCnaeFromApi(code: number | string): string {
  const digits = String(code).replace(/\D/g, "").padStart(7, "0");
  return `${digits.slice(0, 4)}-${digits.slice(4, 5)}/${digits.slice(5, 7)}`;
}

function suggestTaxRate(cnaeCode: string): number {
  return findCnaePreset(cnaeCode)?.rate ?? 6;
}

export async function lookupCnpjFromBrasilApi(
  cnpjDigits: string,
): Promise<CnpjLookupResult | null> {
  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 * 60 * 24 },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`BrasilAPI retornou ${response.status}`);
  }

  const data = (await response.json()) as BrasilApiCnpjResponse;

  if (!data.razao_social || !data.cnae_fiscal) {
    return null;
  }

  const cnaeCode = formatCnaeFromApi(data.cnae_fiscal);

  return {
    cnpj: cnpjDigits,
    legalName: data.razao_social,
    tradeName: data.nome_fantasia || null,
    cnaeCode,
    cnaeDescription: data.cnae_fiscal_descricao ?? "",
    status: data.descricao_situacao_cadastral ?? "Desconhecida",
    suggestedTaxRate: suggestTaxRate(cnaeCode),
    city: data.municipio ?? null,
    state: data.uf ?? null,
  };
}
