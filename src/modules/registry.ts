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
    id: "calculator",
    name: "Calculadora",
    description: "Compare CLT e PJ, simule impostos e entenda seu líquido.",
    href: "/calculator",
    countries: ["BR"],
  },
];

export function getModule(id: string): AppModule | undefined {
  return appModules.find((module) => module.id === id);
}

export function getModulesForCountry(countryCode: CountryCode): AppModule[] {
  return appModules.filter((module) => module.countries.includes(countryCode));
}
