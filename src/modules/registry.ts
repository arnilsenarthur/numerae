import type { CountryCode } from "@/lib/locale";

export type AppModule = {
  id: string;
  name: string;
  description: string;
  href: string;
  countries: CountryCode[];
  badge?: string;
};

export const appModules: AppModule[] = [
  {
    id: "finance",
    name: "Finanças",
    description:
      "Controle de entradas e saídas com contas em vários bancos e moedas, relatórios por categoria e evolução mensal.",
    href: "/finance",
    countries: [],
    badge: "Principal",
  },
  {
    id: "money-map",
    name: "Plano financeiro",
    description:
      "Projeção de renda recorrente com otimização automática: melhor câmbio por instituição, impostos PJ e investimento.",
    href: "/money-map",
    countries: [],
  },
  {
    id: "investments",
    name: "Investimentos",
    description:
      "Planos por perfil de risco com comparação de caminhos e acompanhamento de ações, ETFs e cripto.",
    href: "/investments",
    countries: [],
  },
  {
    id: "calculator",
    name: "Calculadoras",
    description:
      "Conversão de moedas em tempo real, comparação de regimes tributários PJ e otimização de recebimento de salário do exterior.",
    href: "/calculator",
    countries: [],
  },
  {
    id: "companies",
    name: "Empresas",
    description: "Cadastre CNPJ, EIN, VAT e outras empresas para impostos e simulações.",
    href: "/companies",
    countries: [],
  },
];

export function getModule(id: string): AppModule | undefined {
  return appModules.find((module) => module.id === id);
}

export function getModulesForCountry(countryCode: CountryCode): AppModule[] {
  return appModules.filter(
    (module) => module.countries.length === 0 || module.countries.includes(countryCode),
  );
}
