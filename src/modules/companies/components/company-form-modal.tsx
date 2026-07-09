"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/loader";
import { Switch } from "@/components/ui/switch";
import { IconSearch } from "@/components/ui/icons";
import { formatCnpj, isValidCnpj, stripCnpj } from "@/lib/cnpj";
import type { CnpjLookupResult } from "@/lib/cnpj-lookup";
import {
  buildCountrySelectOptions,
  type SerializedCountry,
} from "@/lib/catalog-serializer";
import { fetchJson } from "@/lib/fetch-json";
import { defaultRegistrationKind } from "@/lib/validators-company";
import {
  registrationMetaForCountry,
  taxRegimeOptionsForCountry,
} from "@/modules/companies/lib/registration";
import { useT } from "@/i18n/locale-provider";
import type { SavedCompany } from "@/types/user-company";

type CompanyFormModalProps = {
  open: boolean;
  onClose: () => void;
  countries: SerializedCountry[];
  initial?: SavedCompany | null;
  onSaved: (company: SavedCompany) => void;
};

type FormState = {
  countryCode: string;
  label: string;
  legalName: string;
  registrationId: string;
  activityCode: string;
  activityDescription: string;
  taxRegime: string;
  taxRate: string;
  isDefault: boolean;
};

function emptyForm(countryCode = "BR"): FormState {
  return {
    countryCode,
    label: "",
    legalName: "",
    registrationId: "",
    activityCode: "",
    activityDescription: "",
    taxRegime: countryCode === "BR" ? "simples" : "manual",
    taxRate: "6",
    isDefault: false,
  };
}

function fromCompany(company: SavedCompany): FormState {
  return {
    countryCode: company.countryCode,
    label: company.label,
    legalName: company.legalName ?? "",
    registrationId:
      company.registrationKind === "CNPJ"
        ? formatCnpj(company.registrationId)
        : company.registrationId,
    activityCode: company.activityCode ?? "",
    activityDescription: company.activityDescription ?? "",
    taxRegime: company.taxRegime,
    taxRate: String(company.taxRate),
    isDefault: company.isDefault,
  };
}

export function CompanyFormModal({
  open,
  onClose,
  countries,
  initial,
  onSaved,
}: CompanyFormModalProps) {
  const t = useT();
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookup, setLookup] = useState<CnpjLookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const lastLookupRef = useRef("");

  const countryOptions = useMemo(
    () => buildCountrySelectOptions(countries),
    [countries],
  );

  const registrationMeta = useMemo(
    () => registrationMetaForCountry(form.countryCode, t),
    [form.countryCode, t],
  );

  const taxRegimeOptions = useMemo(
    () => taxRegimeOptionsForCountry(form.countryCode, t),
    [form.countryCode, t],
  );

  useEffect(() => {
    if (!open) return;
    setForm(initial ? fromCompany(initial) : emptyForm());
    setError(null);
    setLookup(null);
    setLookupError(null);
    lastLookupRef.current = "";
  }, [open, initial]);

  useEffect(() => {
    if (form.countryCode !== "BR") {
      setLookup(null);
      setLookupError(null);
      return;
    }

    const digits = stripCnpj(form.registrationId);
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
        setLookupError(data.error ?? t("companies.ui.form.lookupError"));
        lastLookupRef.current = "";
        return;
      }

      const result = data.data as CnpjLookupResult;
      setLookup(result);
      setForm((current) => ({
        ...current,
        label: current.label || result.tradeName?.trim() || result.legalName?.trim() || current.label,
        legalName: result.legalName ?? current.legalName,
        activityCode: result.cnaeCode ?? current.activityCode,
        activityDescription: result.cnaeDescription ?? current.activityDescription,
        taxRate: String(result.suggestedTaxRate),
        taxRegime: "simples",
      }));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [form.countryCode, form.registrationId, t]);

  async function handleSubmit() {
    setError(null);

    const rate = Number(form.taxRate.replace(",", "."));
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      setError(t("companies.ui.form.taxRateRange"));
      return;
    }

    if (!form.label.trim()) {
      setError(t("companies.ui.form.nameRequired"));
      return;
    }

    setSaving(true);

    const payload = {
      countryCode: form.countryCode,
      label: form.label.trim(),
      legalName: form.legalName.trim() || null,
      registrationId: form.registrationId,
      registrationKind: defaultRegistrationKind(form.countryCode),
      activityCode: form.activityCode.trim() || null,
      activityDescription: form.activityDescription.trim() || null,
      taxRegime: form.taxRegime,
      taxRate: rate,
      isDefault: form.isDefault,
    };

    const url = initial ? `/api/companies/${initial.id}` : "/api/companies";
    const method = initial ? "PATCH" : "POST";

    const { response, data } = await fetchJson<{ company?: SavedCompany; error?: string }>(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!response.ok || !data?.company) {
      setError(data?.error ?? t("companies.ui.form.saveError"));
      return;
    }

    onSaved(data.company);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? t("companies.ui.form.editTitle") : t("companies.ui.form.createTitle")}
      description={t("companies.ui.form.description")}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="button" loading={saving} onClick={() => void handleSubmit()}>
            {initial ? t("common.save") : t("companies.ui.form.register")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("companies.ui.form.countryLabel")}</Label>
            <Select
              options={countryOptions}
              value={form.countryCode}
              onChange={(value) =>
                setForm((current) => ({
                  ...emptyForm(value),
                  label: current.label,
                  registrationId: current.registrationId,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("companies.ui.form.shortNameLabel")}</Label>
            <Input
              value={form.label}
              placeholder={t("companies.ui.form.shortNamePlaceholder")}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t("companies.ui.form.legalNameLabel")}</Label>
          <Input
            value={form.legalName}
            placeholder={t("companies.ui.form.legalNamePlaceholder")}
            onChange={(event) => setForm((current) => ({ ...current, legalName: event.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label>{registrationMeta.label}</Label>
          <div className="relative">
            <Input
              value={form.registrationId}
              placeholder={registrationMeta.placeholder}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  registrationId:
                    form.countryCode === "BR"
                      ? formatCnpj(event.target.value)
                      : event.target.value,
                }))
              }
              className="pr-9"
            />
            {form.countryCode === "BR" ? (
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
                {lookingUp ? <Spinner size="sm" /> : <IconSearch size="sm" />}
              </span>
            ) : null}
          </div>
          {registrationMeta.hint ? (
            <p className="text-xs text-zinc-500">{registrationMeta.hint}</p>
          ) : null}
          {lookupError ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">{lookupError}</p>
          ) : null}
        </div>

        {lookup ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-700 dark:bg-zinc-900/40">
            <p className="font-medium text-zinc-800 dark:text-zinc-200">
              {lookup.tradeName || lookup.legalName}
            </p>
            <p className="mt-2 text-zinc-500">
              {t("companies.ui.form.cnaeLabel")} {lookup.cnaeCode} — {lookup.cnaeDescription}
            </p>
          </div>
        ) : null}

        {form.countryCode === "BR" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("companies.ui.form.cnaeLabel")}</Label>
              <Input
                value={form.activityCode}
                onChange={(event) =>
                  setForm((current) => ({ ...current, activityCode: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("companies.ui.form.cnaeDescriptionLabel")}</Label>
              <Input
                value={form.activityDescription}
                onChange={(event) =>
                  setForm((current) => ({ ...current, activityDescription: event.target.value }))
                }
              />
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("companies.ui.form.taxRegimeLabel")}</Label>
            <Select
              options={taxRegimeOptions}
              value={form.taxRegime}
              onChange={(value) => setForm((current) => ({ ...current, taxRegime: value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("companies.ui.form.effectiveRateLabel")}</Label>
            <NumberInput
              value={form.taxRate}
              min={0}
              max={100}
              step="0.1"
              onChange={(event) => setForm((current) => ({ ...current, taxRate: event.target.value }))}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <div>
            <p className="text-sm font-medium">{t("companies.ui.form.defaultCompanyTitle")}</p>
            <p className="text-xs text-zinc-500">{t("companies.ui.form.defaultCompanyHint")}</p>
          </div>
          <Switch
            checked={form.isDefault}
            onChange={(event) =>
              setForm((current) => ({ ...current, isDefault: event.target.checked }))
            }
          />
        </div>

        {error ? <Alert variant="error">{error}</Alert> : null}
      </div>
    </Modal>
  );
}
