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
    id: "money-map",
    name: "Plano financeiro",
    description:
      "Entradas e saídas com projeção futura, tratamentos lineares e realizado via Open Finance.",
    href: "/money-map",
    countries: ["BR"],
    badge: "Principal",
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
