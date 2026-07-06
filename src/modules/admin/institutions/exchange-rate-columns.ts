import type { SelectOption } from "@/components/ui/select";
import type { SerializedExchangeRate } from "@/lib/institution-serializer";
import { effectiveExchangeRate } from "@/lib/institutions";
import { DEFAULT_EXCHANGE_RATE_TTL_SECONDS } from "@/lib/spoilable-field";
import type { SmartTableColumn } from "@/components/ui/smart-table";

function formatRate(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value);
}

export type ExchangeRateForm = {
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  spreadPercent: string;
  feeFixed: string;
  feePercent: string;
  notes: string;
  active: boolean;
};

export const emptyExchangeRateForm = (): ExchangeRateForm => ({
  fromCurrency: "USD",
  toCurrency: "BRL",
  rate: "",
  spreadPercent: "0",
  feeFixed: "",
  feePercent: "",
  notes: "",
  active: true,
});

export function exchangeRateToForm(rate: SerializedExchangeRate): ExchangeRateForm {
  return {
    fromCurrency: rate.fromCurrency,
    toCurrency: rate.toCurrency,
    rate: String(rate.rate),
    spreadPercent: String(rate.spreadPercent),
    feeFixed: rate.feeFixed == null ? "" : String(rate.feeFixed),
    feePercent: rate.feePercent == null ? "" : String(rate.feePercent),
    notes: rate.notes ?? "",
    active: rate.active,
  };
}

export function applyExchangeRateFormField(
  form: ExchangeRateForm,
  key: string,
  value: unknown,
): ExchangeRateForm {
  const next = { ...form };

  if (key === "fromCurrency") {
    next.fromCurrency = String(value ?? "USD");
    return next;
  }

  if (key === "toCurrency") {
    next.toCurrency = String(value ?? "BRL");
    return next;
  }

  if (key === "rate") {
    next.rate = String(value ?? "");
    return next;
  }

  if (key === "spreadPercent") {
    next.spreadPercent = String(value ?? "0");
    return next;
  }

  if (key === "feeFixed") {
    next.feeFixed = String(value ?? "");
    return next;
  }

  if (key === "feePercent") {
    next.feePercent = String(value ?? "");
    return next;
  }

  if (key === "notes") {
    next.notes = String(value ?? "");
    return next;
  }

  if (key === "active") {
    next.active = Boolean(value);
    return next;
  }

  return next;
}

export function createExchangeRatePayload(form: ExchangeRateForm) {
  return {
    fromCurrency: form.fromCurrency,
    toCurrency: form.toCurrency,
    rate: Number(form.rate),
    spreadPercent: Number(form.spreadPercent || 0),
    active: form.active,
  };
}

export function editExchangeRatePayload(form: ExchangeRateForm) {
  return {
    rate: Number(form.rate),
    spreadPercent: Number(form.spreadPercent || 0),
    feeFixed: form.feeFixed ? Number(form.feeFixed) : null,
    feePercent: form.feePercent ? Number(form.feePercent) : null,
    notes: form.notes.trim(),
    active: form.active,
  };
}

export function buildExchangeRateColumns(options: {
  patchRate: (
    rateId: string,
    body: Record<string, unknown>,
  ) => void | Promise<void>;
  currencyOptions: SelectOption[];
}): SmartTableColumn<SerializedExchangeRate>[] {
  const { patchRate, currencyOptions } = options;

  return [
    {
      id: "fromCurrency",
      header: "De",
      sortValue: (row) => row.fromCurrency,
      field: {
        type: "select",
        scope: "both",
        formKey: "fromCurrency",
        modalOrder: 1,
        modalLabel: "De",
        getValue: (row) => row.fromCurrency,
        options: currencyOptions,
        onSave: (row, value) => patchRate(row.id, { fromCurrency: String(value) }),
        modalDisabled: ({ isCreating, row }) => Boolean(row) && !isCreating,
      },
    },
    {
      id: "toCurrency",
      header: "Para",
      sortValue: (row) => row.toCurrency,
      field: {
        type: "select",
        scope: "both",
        formKey: "toCurrency",
        modalOrder: 2,
        modalLabel: "Para",
        getValue: (row) => row.toCurrency,
        options: currencyOptions,
        onSave: (row, value) => patchRate(row.id, { toCurrency: String(value) }),
        modalDisabled: ({ isCreating, row }) => Boolean(row) && !isCreating,
      },
    },
    {
      id: "rate",
      header: "Taxa",
      sortValue: (row) => row.rate,
      field: {
        type: "spoilable-number",
        scope: "both",
        formKey: "rate",
        modalOrder: 3,
        getValue: (row) => row.rate,
        getUpdatedAt: (row) => row.rateUpdatedAt,
        getTtlSeconds: (row) => row.rateTtlSeconds || DEFAULT_EXCHANGE_RATE_TTL_SECONDS,
        step: "0.000001",
        min: 0.000001,
        placeholder: "0.000000",
        onSave: (row, value) =>
          patchRate(row.id, { rate: value === null ? undefined : Number(value) }),
      },
    },
    {
      id: "spreadPercent",
      header: "Spread %",
      sortValue: (row) => row.spreadPercent,
      field: {
        type: "spoilable-number",
        scope: "both",
        formKey: "spreadPercent",
        modalOrder: 4,
        getValue: (row) => row.spreadPercent,
        getUpdatedAt: (row) => row.spreadUpdatedAt,
        getTtlSeconds: (row) => row.spreadTtlSeconds || DEFAULT_EXCHANGE_RATE_TTL_SECONDS,
        step: "0.01",
        min: 0,
        placeholder: "0",
        onSave: (row, value) =>
          patchRate(row.id, {
            spreadPercent: value === null ? 0 : Number(value),
          }),
      },
    },
    {
      id: "effective",
      header: "Efetiva",
      sortValue: (row) => effectiveExchangeRate(row.rate, row.spreadPercent),
      field: {
        type: "readonly",
        scope: "table",
        getValue: (row) => effectiveExchangeRate(row.rate, row.spreadPercent),
        formatReadonly: (_row, value) => formatRate(Number(value)),
      },
    },
    {
      id: "feeFixed",
      header: "Taxa fixa",
      hidden: true,
      field: {
        type: "number",
        scope: "modal",
        formKey: "feeFixed",
        modalOrder: 5,
        getValue: (row) => row.feeFixed,
        step: "0.01",
        min: 0,
        placeholder: "0",
      },
    },
    {
      id: "feePercent",
      header: "Taxa %",
      hidden: true,
      field: {
        type: "number",
        scope: "modal",
        formKey: "feePercent",
        modalOrder: 6,
        getValue: (row) => row.feePercent,
        step: "0.01",
        min: 0,
        placeholder: "0",
      },
    },
    {
      id: "notes",
      header: "Notas",
      hidden: true,
      field: {
        type: "textarea",
        scope: "modal",
        formKey: "notes",
        modalOrder: 7,
        getValue: (row) => row.notes ?? "",
        placeholder: "Fonte, condições…",
      },
    },
    {
      id: "active",
      header: "Ativa",
      align: "center",
      sortValue: (row) => (row.active ? 1 : 0),
      field: {
        type: "boolean",
        scope: "both",
        formKey: "active",
        modalOrder: 8,
        modalLabel: "Par ativo",
        hint: "Ativa",
        getValue: (row) => row.active,
        onSave: (row, value) => patchRate(row.id, { active: Boolean(value) }),
      },
    },
  ];
}
