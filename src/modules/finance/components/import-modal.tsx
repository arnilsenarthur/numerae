"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { IconCheck, IconDownload, IconX } from "@/components/ui/icons";
import { useLocale, useT } from "@/i18n/locale-provider";
import { resolveDefaultAccountId, type SerializedAccount } from "@/types/finance";

type Step = "upload" | "mapping" | "preview";

type CsvMapping = {
  date: string;
  description: string;
  amount: string;
  kind: string;
  category: string;
};

type PreviewRow = {
  date: string;
  description: string;
  amount: number;
  kind: "INCOME" | "EXPENSE";
  category: string;
  valid: boolean;
  error?: string;
};

type PreviewResult = {
  preview: PreviewRow[];
  total: number;
  valid: number;
  invalid: number;
};

export function ImportModal({
  open,
  onClose,
  accounts,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  accounts: SerializedAccount[];
  onImported: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const defaultAccountId = useMemo(() => resolveDefaultAccountId(accounts), [accounts]);
  const [accountId, setAccountId] = useState(defaultAccountId);

  useEffect(() => {
    if (defaultAccountId) setAccountId(defaultAccountId);
  }, [defaultAccountId]);
  const [mapping, setMapping] = useState<CsvMapping>({
    date: "",
    description: "",
    amount: "",
    kind: "",
    category: "",
  });
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<number | null>(null);

  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }));
  const headerOptions = useMemo(
    () => [
      { value: "", label: t("finance.pages.import.notMapped") },
      ...headers.map((h) => ({ value: h, label: h })),
    ],
    [headers, t],
  );

  const mappingFields = useMemo(
    () =>
      [
        { key: "date" as const, label: t("finance.pages.import.mapDate") },
        { key: "description" as const, label: t("finance.pages.import.mapDescription") },
        { key: "amount" as const, label: t("finance.pages.import.mapAmount") },
        { key: "kind" as const, label: t("finance.pages.import.mapKind") },
        { key: "category" as const, label: t("finance.pages.import.mapCategory") },
      ],
    [t],
  );

  function reset() {
    setStep("upload");
    setFile(null);
    setHeaders([]);
    setMapping({ date: "", description: "", amount: "", kind: "", category: "" });
    setPreview(null);
    setError(null);
    setImported(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    setFile(f);
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const firstLine = text.split(/\r?\n/)[0] ?? "";
      const cols = firstLine.split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
      setHeaders(cols);

      const detect = (candidates: string[]) =>
        cols.find((c) => candidates.some((cand) => c.toLowerCase().includes(cand))) ?? "";

      setMapping({
        date: detect(["data", "date", "dt"]),
        description: detect(["descri", "desc", "memo", "historico", "histórico"]),
        amount: detect(["valor", "amount", "value", "vl", "vlr"]),
        kind: detect(["tipo", "kind", "type", "natureza"]),
        category: detect(["categoria", "category", "cat"]),
      });
    };
    reader.readAsText(f);
  }

  async function fetchPreview() {
    if (!file || !mapping.date || !mapping.description || !mapping.amount) {
      setError(t("finance.pages.import.requiredMappingError"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mapping", JSON.stringify(mapping));
      formData.append("accountId", accountId);
      formData.append("confirm", "false");

      const res = await fetch("/api/transactions/import", { method: "POST", body: formData });
      const data = (await res.json()) as PreviewResult & { error?: string };

      if (!res.ok) {
        setError(data.error ?? t("finance.pages.import.processError"));
        return;
      }

      setPreview(data);
      setStep("preview");
    } catch {
      setError(t("finance.pages.import.processError"));
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mapping", JSON.stringify(mapping));
      formData.append("accountId", accountId);
      formData.append("confirm", "true");

      const res = await fetch("/api/transactions/import", { method: "POST", body: formData });
      const data = (await res.json()) as { imported?: number; error?: string };

      if (!res.ok) {
        setError(data.error ?? t("finance.pages.import.importError"));
        return;
      }

      setImported(data.imported ?? 0);
      onImported();
    } catch {
      setError(t("finance.pages.import.importError"));
    } finally {
      setLoading(false);
    }
  }

  function renderUpload() {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <Label>{t("finance.pages.import.destinationAccount")}</Label>
          <Select
            options={accountOptions}
            value={accountId}
            onChange={setAccountId}
          />
        </div>

        <div
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 p-8 text-center transition hover:border-emerald-400 dark:border-zinc-700 dark:hover:border-emerald-600"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) {
              const fakeEvent = { target: { files: [f] } } as unknown as React.ChangeEvent<HTMLInputElement>;
              handleFileChange(fakeEvent);
            }
          }}
        >
          <IconDownload size="sm" className="mb-2 text-zinc-400" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {file ? file.name : t("finance.pages.import.dropzone")}
          </p>
          <p className="mt-1 text-xs text-zinc-400">{t("finance.pages.import.dropzoneHint")}</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {file && headers.length > 0 ? (
          <p className="text-xs text-zinc-500">
            {t("finance.pages.import.columnsDetected", {
              count: headers.length,
              preview: `${headers.slice(0, 5).join(", ")}${headers.length > 5 ? "…" : ""}`,
            })}
          </p>
        ) : null}
      </div>
    );
  }

  function renderMapping() {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-500">{t("finance.pages.import.mappingHint")}</p>
        {mappingFields.map(({ key, label }) => (
          <div key={key} className="grid grid-cols-2 items-center gap-3">
            <Label className="text-sm">{label}</Label>
            <Select
              options={headerOptions}
              value={mapping[key]}
              onChange={(value) => setMapping((prev) => ({ ...prev, [key]: value }))}
            />
          </div>
        ))}
      </div>
    );
  }

  function renderPreview() {
    if (!preview) return null;
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline" className="text-xs">
            {t("finance.pages.import.totalRows", { count: preview.total })}
          </Badge>
          <Badge variant="outline" className="text-xs text-emerald-600">
            <IconCheck size="xs" className="mr-1" />{" "}
            {t("finance.pages.import.validRows", { count: preview.valid })}
          </Badge>
          {preview.invalid > 0 ? (
            <Badge variant="outline" className="text-xs text-red-600">
              <IconX size="xs" className="mr-1" />{" "}
              {t("finance.pages.import.invalidRows", { count: preview.invalid })}
            </Badge>
          ) : null}
        </div>

        <div className="max-h-64 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-zinc-500">
                  {t("finance.pages.import.previewDate")}
                </th>
                <th className="px-3 py-2 text-left font-medium text-zinc-500">
                  {t("finance.pages.import.previewDescription")}
                </th>
                <th className="px-3 py-2 text-right font-medium text-zinc-500">
                  {t("finance.pages.import.previewAmount")}
                </th>
                <th className="px-3 py-2 text-left font-medium text-zinc-500">
                  {t("finance.pages.import.previewKind")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {preview.preview.map((row, i) => (
                <tr
                  key={i}
                  className={row.valid ? "" : "bg-red-50/50 dark:bg-red-950/20"}
                >
                  <td className="px-3 py-1.5 text-zinc-600 dark:text-zinc-400">
                    {row.valid ? new Date(row.date).toLocaleDateString(locale) : row.date}
                  </td>
                  <td className="max-w-[120px] truncate px-3 py-1.5">{row.description}</td>
                  <td className={`px-3 py-1.5 text-right tabular-nums ${row.kind === "EXPENSE" ? "text-red-600" : "text-emerald-600"}`}>
                    {row.valid ? row.amount.toFixed(2) : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-zinc-500">
                    {row.valid ? (
                      row.kind === "INCOME"
                        ? t("finance.pages.import.kindIncome")
                        : t("finance.pages.import.kindExpense")
                    ) : (
                      <span className="text-red-500">{row.error}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {preview.total > 10 ? (
          <p className="text-xs text-zinc-400">
            {t("finance.pages.import.previewTruncated", { total: preview.total })}
          </p>
        ) : null}
      </div>
    );
  }

  if (imported !== null) {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title={t("finance.pages.import.doneTitle")}
        footer={
          <Button type="button" onClick={handleClose}>
            {t("common.close")}
          </Button>
        }
      >
        <div className="py-4 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <IconCheck size="sm" />
          </div>
          <p className="text-base font-semibold">
            {t("finance.pages.import.doneCount", { count: imported })}
          </p>
          <p className="mt-1 text-sm text-zinc-500">{t("finance.pages.import.doneHint")}</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        step === "upload"
          ? t("finance.pages.import.stepUpload")
          : step === "mapping"
            ? t("finance.pages.import.stepMapping")
            : t("finance.pages.import.stepConfirm")
      }
      size="lg"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={step === "upload" ? handleClose : () => setStep(step === "preview" ? "mapping" : "upload")}
            disabled={loading}
          >
            {step === "upload" ? t("common.cancel") : t("finance.pages.import.back")}
          </Button>
          {step === "upload" ? (
            <Button
              type="button"
              onClick={() => setStep("mapping")}
              disabled={!file || headers.length === 0}
            >
              {t("finance.pages.import.next")}
            </Button>
          ) : step === "mapping" ? (
            <Button type="button" onClick={() => void fetchPreview()} disabled={loading}>
              {loading ? t("finance.pages.import.processing") : t("finance.pages.import.preview")}
            </Button>
          ) : (
            <Button type="button" onClick={() => void confirmImport()} disabled={loading}>
              {loading
                ? t("finance.pages.import.importing")
                : t("finance.pages.import.importCount", { count: preview?.valid ?? 0 })}
            </Button>
          )}
        </>
      }
    >
      {error ? <Alert variant="error" className="mb-4">{error}</Alert> : null}
      {step === "upload" ? renderUpload() : step === "mapping" ? renderMapping() : renderPreview()}
    </Modal>
  );
}
