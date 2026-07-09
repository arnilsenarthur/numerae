"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { SmartTable, SmartTableModalFields, type SmartTableColumn } from "@/components/ui/smart-table";
import { IconTrash } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { useConfirm } from "@/hooks/use-confirm";
import type { SerializedCountry } from "@/lib/catalog-serializer";
import { getCountryFlagUrl, getCountryFlagSrcSet } from "@/lib/country-flags";

type CountryForm = { code: string; name: string; active: boolean };

const emptyForm = (): CountryForm => ({ code: "", name: "", active: true });

function CountryFlag({ code }: { code: string }) {
  const src = getCountryFlagUrl(code, 40);
  const srcSet = getCountryFlagSrcSet(code);
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      srcSet={srcSet}
      alt=""
      className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
    />
  );
}

export function CountriesAdmin() {
  const [countries, setCountries] = useState<SerializedCountry[]>([]);
  const [form, setForm] = useState<CountryForm>(emptyForm());
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { response, data } = await fetchJson<{ countries: SerializedCountry[]; error?: string }>(
        "/api/admin/countries",
      );
      if (!response.ok || !data?.countries) {
        throw new Error(data?.error ?? "Erro ao carregar países.");
      }
      setCountries(data.countries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchCountry = useCallback(
    async (code: string, body: Partial<Omit<CountryForm, "code">>) => {
      setError(null);
      const { response, data } = await fetchJson<{ country?: SerializedCountry; error?: string }>(
        `/api/admin/countries/${code}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) throw new Error(data?.error ?? "Erro ao salvar.");

      if (data?.country) {
        setCountries((prev) => prev.map((item) => (item.code === code ? data.country! : item)));
      } else {
        await load();
      }
    },
    [load],
  );

  function closeModal() {
    setIsCreating(false);
    setEditingCode(null);
    setForm(emptyForm());
    setError(null);
  }

  function startCreate() {
    setIsCreating(true);
    setEditingCode(null);
    setForm(emptyForm());
    setError(null);
  }

  function startEdit(country: SerializedCountry) {
    setIsCreating(false);
    setEditingCode(country.code);
    setForm({ code: country.code, name: country.name, active: country.active });
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const { response, data } = await fetchJson<{ error?: string }>(
        isCreating ? "/api/admin/countries" : `/api/admin/countries/${editingCode}`,
        {
          method: isCreating ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      if (!response.ok) throw new Error(data?.error ?? "Erro ao salvar.");
      closeModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editingCode) return;
    const ok = await confirm({
      title: "Excluir país",
      message: "Excluir este país?",
      confirmLabel: "Excluir",
      tone: "error",
    });
    if (!ok) return;
    setSaving(true);
    try {
      const { response, data } = await fetchJson<{ error?: string }>(
        `/api/admin/countries/${editingCode}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error(data?.error ?? "Erro ao excluir.");
      closeModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo<SmartTableColumn<SerializedCountry>[]>(
    () => [
      {
        id: "code",
        header: "Código",
        sortValue: (row) => row.code,
        cell: (row) => (
          <span className="inline-flex items-center gap-2 font-medium">
            <CountryFlag code={row.code} />
            {row.code}
          </span>
        ),
        field: {
          type: "text",
          scope: "modal",
          formKey: "code",
          getValue: (row) => row.code,
          placeholder: "BR",
          modalDisabled: ({ isCreating }) => !isCreating,
          modalRender: ({ value, onChange, label, disabled }) => (
            <div className="space-y-1.5">
              <Label htmlFor="country-code">{label}</Label>
              <Input
                id="country-code"
                value={String(value ?? "")}
                onChange={(event) => onChange(event.target.value.toUpperCase())}
                maxLength={2}
                disabled={disabled}
                placeholder="BR"
              />
            </div>
          ),
        },
      },
      {
        id: "name",
        header: "Nome",
        sortValue: (row) => row.name,
        field: {
          type: "text",
          scope: "both",
          formKey: "name",
          getValue: (row) => row.name,
          placeholder: "Nome do país",
          onSave: (row, value) => patchCountry(row.code, { name: String(value ?? "") }),
        },
      },
      {
        id: "currencies",
        header: "Moedas",
        sortValue: (row) => row.currenciesCount ?? 0,
        align: "center",
        field: {
          type: "readonly",
          getValue: (row) => row.currenciesCount ?? 0,
          formatReadonly: (_row, value) => value,
        },
      },
      {
        id: "active",
        header: "Ativo",
        sortValue: (row) => (row.active ? 1 : 0),
        align: "center",
        field: {
          type: "boolean",
          scope: "both",
          formKey: "active",
          modalLabel: "Ativo",
          getValue: (row) => row.active,
          hint: "Ativo",
          onSave: (row, value) => patchCountry(row.code, { active: Boolean(value) }),
        },
      },
    ],
    [patchCountry],
  );

  const modalOpen = isCreating || !!editingCode;
  const canDelete = !isCreating && (countries.find((c) => c.code === editingCode)?.currenciesCount ?? 0) === 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-emerald-600">Admin</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Países</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Edite campos direto na tabela ou use Editar para o formulário completo.
          </p>
        </div>
      </div>

      {error && !modalOpen ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cadastrados</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <p className="py-6 text-sm text-zinc-500">Carregando...</p>
          ) : (
            <SmartTable
              data={countries}
              columns={columns}
              getRowKey={(row) => row.code}
              pageSize={10}
              searchPlaceholder="Buscar países…"
              searchFilter={(row, query) =>
                [row.name, row.code].some((field) => field.toLowerCase().includes(query))
              }
              onCreate={startCreate}
              createLabel="Novo país"
              onEdit={startEdit}
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={isCreating ? "Novo país" : `Editar — ${form.name}`}
        size="lg"
        className="max-w-md"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            {!isCreating && canDelete ? (
              <Button type="button" variant="danger" onClick={() => void remove()} disabled={saving}>
                <IconTrash size="sm" />
                Excluir
              </Button>
            ) : null}
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? "Salvando..." : isCreating ? "Criar" : "Salvar"}
            </Button>
          </>
        }
      >
        {error ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : null}
        <SmartTableModalFields
          columns={columns}
          form={form}
          onChange={(key, value) =>
            setForm((prev) => ({
              ...prev,
              [key]:
                key === "code" && typeof value === "string"
                  ? value.toUpperCase()
                  : value,
            }))
          }
          row={editingCode ? countries.find((c) => c.code === editingCode) ?? null : null}
          isCreating={isCreating}
          saving={saving}
        />
      </Modal>
      {dialog}
    </div>
  );
}
