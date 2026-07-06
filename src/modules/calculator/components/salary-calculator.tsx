"use client";

import { useMemo, useState } from "react";
import { CnpjSelector, type SavedCnpj } from "@/modules/calculator/components/cnpj-selector";
import { DeductionBreakdown } from "@/modules/calculator/components/deduction-breakdown";
import { calculateClt, calculatePj } from "@/modules/calculator/engines";
import type { EmploymentType } from "@/modules/calculator/types";
import { formatCountryMoney, type CountryCode } from "@/lib/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type SalaryCalculatorProps = {
  countryCode?: CountryCode;
};

function parseMoneyInput(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function SalaryCalculator({ countryCode = "BR" }: SalaryCalculatorProps) {
  const [employmentType, setEmploymentType] = useState<EmploymentType>("clt");
  const [grossInput, setGrossInput] = useState("8000");
  const [dependents, setDependents] = useState("0");
  const [selectedCnpj, setSelectedCnpj] = useState<SavedCnpj | null>(null);
  const [manualRate, setManualRate] = useState(6);
  const [useManualRate, setUseManualRate] = useState(true);

  const gross = parseMoneyInput(grossInput);
  const dependentsCount = Math.max(0, Number(dependents) || 0);
  const effectiveRate = useManualRate ? manualRate : (selectedCnpj?.taxRate ?? manualRate);

  const result = useMemo(() => {
    if (employmentType === "clt") {
      return calculateClt(countryCode, {
        grossSalary: gross,
        dependents: dependentsCount,
      });
    }

    return calculatePj(countryCode, {
      grossRevenue: gross,
      taxRatePercent: effectiveRate,
      taxRegime: selectedCnpj?.taxRegime ?? (useManualRate ? "manual" : "simples"),
      cnaeCode: selectedCnpj?.cnaeCode ?? undefined,
    });
  }, [
    countryCode,
    dependentsCount,
    effectiveRate,
    employmentType,
    gross,
    selectedCnpj,
    useManualRate,
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-emerald-600">Módulo · Calculadora</p>
          <Badge variant="default">Brasil</Badge>
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Salário líquido CLT vs PJ
        </h1>
        <p className="mt-2 max-w-2xl text-zinc-500">
          Simule descontos e compare quanto sobra no bolso em cada regime. Pensado para
          quem decide entre contrato CLT ou prestar serviços como PJ.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Dados da simulação</CardTitle>
            <CardDescription>
              Informe o valor bruto mensal e o tipo de vínculo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Tabs
              defaultValue="clt"
              onValueChange={(value) => setEmploymentType(value as EmploymentType)}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="clt">CLT</TabsTrigger>
                <TabsTrigger value="pj">PJ</TabsTrigger>
              </TabsList>

              <TabsContent value="clt" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="clt-gross">Salário bruto mensal</Label>
                  <Input
                    id="clt-gross"
                    inputMode="decimal"
                    value={grossInput}
                    onChange={(event) => setGrossInput(event.target.value)}
                    placeholder="8000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dependents">Dependentes (IRRF)</Label>
                  <Input
                    id="dependents"
                    inputMode="numeric"
                    value={dependents}
                    onChange={(event) => setDependents(event.target.value)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="pj" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="pj-gross">Faturamento / contrato bruto mensal</Label>
                  <Input
                    id="pj-gross"
                    inputMode="decimal"
                    value={grossInput}
                    onChange={(event) => setGrossInput(event.target.value)}
                    placeholder="12000"
                  />
                </div>

                <CnpjSelector
                  value={selectedCnpj}
                  onChange={setSelectedCnpj}
                  manualRate={manualRate}
                  onManualRateChange={setManualRate}
                  useManualRate={useManualRate}
                  onUseManualRateChange={setUseManualRate}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
            <CardDescription>
              {employmentType === "clt"
                ? "Descontos de INSS e IRRF sobre o salário CLT."
                : `Impostos estimados com alíquota de ${effectiveRate.toLocaleString("pt-BR")}%.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gross <= 0 ? (
              <p className="text-sm text-zinc-500">Informe um valor bruto para calcular.</p>
            ) : (
              <DeductionBreakdown
                gross={result.gross}
                net={result.net}
                deductions={result.deductions}
                notes={result.notes}
                countryCode={countryCode}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {gross > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo rápido</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-300">
            <span>
              Bruto: <strong>{formatCountryMoney(result.gross, countryCode)}</strong>
            </span>
            <span>
              Líquido:{" "}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {formatCountryMoney(result.net, countryCode)}
              </strong>
            </span>
            <span>
              Retenção efetiva:{" "}
              <strong>
                {result.gross > 0
                  ? `${((result.totalDeductions / result.gross) * 100).toFixed(1)}%`
                  : "0%"}
              </strong>
            </span>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
