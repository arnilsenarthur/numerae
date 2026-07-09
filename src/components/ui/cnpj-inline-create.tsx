"use client";

import { useEffect, useRef, useState } from "react";
import { formatCnpj, isValidCnpj, stripCnpj } from "@/lib/cnpj";
import type { CnpjLookupResult } from "@/lib/cnpj-lookup";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/loader";
import { IconSearch } from "@/components/ui/icons";
import type { SavedCnpj } from "@/types/user-cnpj";
import { useT } from "@/i18n/locale-provider";

type CnpjInlineCreateProps = {
  onSaved: (cnpj: SavedCnpj) => void;
  isFirst?: boolean;
};

export function CnpjInlineCreate({ onSaved, isFirst = false }: CnpjInlineCreateProps) {
  const t = useT();
  const [cnpjInput, setCnpjInput] = useState("");
  const [taxRate, setTaxRate] = useState("6");
  const [lookup, setLookup] = useState<CnpjLookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastLookupRef = useRef<string>("");

  useEffect(() => {
    const digits = stripCnpj(cnpjInput);

    if (digits.length !== 14 || !isValidCnpj(digits)) {
      setLookup(null);
      setLookupError(null);
      return;
    }

    if (digits === lastLookupRef.current) return;

    const timer = window.setTimeout(async () => {
      lastLookupRef.current = digits;
      setLookingUp(true);
      setLookupError(null);

      const response = await fetch(`/api/cnpj/lookup?cnpj=${digits}`);
      const data = await response.json();
      setLookingUp(false);

      if (!response.ok) {
        setLookup(null);
        setLookupError(data.error ?? t("ui.pickers.cnpj.lookupError"));
        lastLookupRef.current = "";
        return;
      }

      const result = data.data as CnpjLookupResult;
      setLookup(result);
      setTaxRate(String(result.suggestedTaxRate));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [cnpjInput]);

  async function handleSave() {
    setError(null);

    const digits = stripCnpj(cnpjInput);
    if (!isValidCnpj(digits)) {
      setError(t("ui.pickers.cnpj.invalidCnpj"));
      return;
    }

    const rate = Number(taxRate.replace(",", "."));
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      setError(t("ui.pickers.cnpj.taxRateRange"));
      return;
    }

    const label =
      lookup?.tradeName?.trim() ||
      lookup?.legalName?.trim() ||
      t("ui.pickers.company.label");

    setSaving(true);
    const response = await fetch("/api/cnpjs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cnpj: digits,
        label,
        cnaeCode: lookup?.cnaeCode,
        cnaeDescription: lookup?.cnaeDescription,
        taxRate: rate,
        taxRegime: lookup?.cnaeCode ? "simples" : "manual",
        isDefault: isFirst,
      }),
    });
    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(data.error ?? t("ui.pickers.cnpj.saveError"));
      return;
    }

    onSaved(data.cnpj as SavedCnpj);
    setCnpjInput("");
    setLookup(null);
    setTaxRate("6");
    lastLookupRef.current = "";
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {t("ui.pickers.cnpj.title")}
      </p>

      <div className="relative">
        <Input
          value={cnpjInput}
          onChange={(event) => setCnpjInput(formatCnpj(event.target.value))}
          placeholder={t("ui.pickers.cnpj.placeholder")}
          className="pr-9"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
          {lookingUp ? <Spinner size="sm" /> : <IconSearch size="sm" />}
        </span>
      </div>

      {lookupError ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">{lookupError}</p>
      ) : null}

      {lookup ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-3 text-xs dark:border-zinc-700 dark:bg-zinc-950">
          <p className="font-medium text-zinc-800 dark:text-zinc-200">
            {lookup.tradeName || lookup.legalName}
          </p>
          {lookup.tradeName ? (
            <p className="mt-0.5 text-zinc-500">{lookup.legalName}</p>
          ) : null}
          <p className="mt-2 text-zinc-500">
            CNAE {lookup.cnaeCode} — {lookup.cnaeDescription}
          </p>
          <p className="mt-1 text-zinc-500">
            {lookup.city && lookup.state
              ? `${lookup.city}/${lookup.state} · `
              : ""}
            {lookup.status}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <label htmlFor="inline-tax-rate" className="shrink-0 text-zinc-500">
              {t("ui.pickers.cnpj.taxRateLabel")}
            </label>
            <Input
              id="inline-tax-rate"
              inputMode="decimal"
              value={taxRate}
              onChange={(event) => setTaxRate(event.target.value)}
              className="h-8"
            />
          </div>
        </div>
      ) : null}

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Button
        type="button"
        size="sm"
        className="w-full"
        loading={saving}
        disabled={!isValidCnpj(cnpjInput)}
        onClick={handleSave}
      >
        {t("ui.pickers.cnpj.saveAndSelect")}
      </Button>
    </div>
  );
}
