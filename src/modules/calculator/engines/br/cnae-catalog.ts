export type CnaePreset = {
  code: string;
  description: string;
  annex: string;
  rate: number;
  hint?: string;
};

/** CNAEs comuns + alíquota nominal do Simples (Anexo III/IV/V). Ajuste conforme faturamento. */
export const CNAE_CATALOG_BR: CnaePreset[] = [
  {
    code: "6201-5/01",
    description: "Desenvolvimento de programas sob encomenda",
    annex: "III",
    rate: 6,
    hint: "Anexo III — serviços intelectuais",
  },
  {
    code: "6202-3/00",
    description: "Desenvolvimento e licenciamento de programas de computador",
    annex: "III",
    rate: 6,
  },
  {
    code: "6203-1/00",
    description: "Desenvolvimento e licenciamento de programas customizáveis",
    annex: "III",
    rate: 6,
  },
  {
    code: "6204-0/00",
    description: "Consultoria em tecnologia da informação",
    annex: "III",
    rate: 6,
  },
  {
    code: "6311-9/00",
    description: "Tratamento de dados, hospedagem e serviços relacionados",
    annex: "III",
    rate: 6,
  },
  {
    code: "7020-4/00",
    description: "Consultoria em gestão empresarial",
    annex: "III",
    rate: 6,
  },
  {
    code: "7319-0/02",
    description: "Promoção de vendas",
    annex: "III",
    rate: 6,
  },
  {
    code: "8599-6/04",
    description: "Treinamento em desenvolvimento profissional e gerencial",
    annex: "III",
    rate: 6,
  },
  {
    code: "8211-3/00",
    description: "Serviços combinados de escritório e apoio administrativo",
    annex: "III",
    rate: 6,
  },
  {
    code: "7490-1/04",
    description: "Atividades de intermediação e agenciamento de serviços",
    annex: "III",
    rate: 6,
  },
];

export function findCnaePreset(code: string): CnaePreset | undefined {
  return CNAE_CATALOG_BR.find((item) => item.code === code);
}
