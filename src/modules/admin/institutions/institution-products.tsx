"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { SmartTable, SmartTableModalFields } from "@/components/ui/smart-table";
import { IconX } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import {
  buildCurrencySelectOptions,
  type SerializedCurrency,
} from "@/lib/catalog-serializer";
import type { SerializedInstitutionProduct } from "@/lib/product-serializer";
import {
  applyProductFormField,
  buildInstitutionProductColumns,
  emptyProductForm,
  productFormPayload,
  productToForm,
  type InstitutionProductForm,
} from "./institution-product-columns";

export function InstitutionProducts({
  institutionId,
  currencies,
}: {
  institutionId: string;
  currencies: SerializedCurrency[];
}) {
  const [products, setProducts] = useState<SerializedInstitutionProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<InstitutionProductForm>(emptyProductForm());
  const [creating, setCreating] = useState(false);
  const [editProduct, setEditProduct] = useState<SerializedInstitutionProduct | null>(null);
  const [editForm, setEditForm] = useState<InstitutionProductForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const currencyOptions = useMemo(
    () => buildCurrencySelectOptions(currencies),
    [currencies],
  );

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { response, data } = await fetchJson<{
        products: SerializedInstitutionProduct[];
        error?: string;
      }>(`/api/admin/institutions/${institutionId}/products`);

      if (!response.ok) {
        throw new Error(data?.error ?? "Erro ao carregar produtos.");
      }

      setProducts(data?.products ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar produtos.");
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const patchProduct = useCallback(
    async (productId: string, body: Record<string, unknown>) => {
      setError(null);
      const { response, data } = await fetchJson<{
        product?: SerializedInstitutionProduct;
        error?: string;
      }>(`/api/admin/institutions/${institutionId}/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const message = data?.error ?? "Erro ao salvar produto.";
        setError(message);
        throw new Error(message);
      }

      if (data?.product) {
        setProducts((prev) =>
          prev.map((item) => (item.id === productId ? data.product! : item)),
        );
      } else {
        await loadProducts();
      }
    },
    [institutionId, loadProducts],
  );

  const columns = useMemo(
    () => buildInstitutionProductColumns({ patchProduct, currencyOptions }),
    [currencyOptions, patchProduct],
  );

  async function createProduct() {
    setCreating(true);
    setError(null);

    try {
      const { response, data } = await fetchJson<{
        product?: SerializedInstitutionProduct;
        error?: string;
      }>(`/api/admin/institutions/${institutionId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productFormPayload(createForm)),
      });

      if (!response.ok || !data?.product) {
        throw new Error(data?.error ?? "Erro ao criar produto.");
      }

      setProducts((prev) =>
        [...prev, data.product!].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      );
      setCreateOpen(false);
      setCreateForm(emptyProductForm());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar produto.");
    } finally {
      setCreating(false);
    }
  }

  async function saveEditProduct() {
    if (!editProduct || !editForm) return;

    setSavingEdit(true);
    setError(null);

    try {
      await patchProduct(editProduct.id, productFormPayload(editForm));
      setEditProduct(null);
      setEditForm(null);
    } catch {
      // error handled in patchProduct
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteProduct(product: SerializedInstitutionProduct) {
    if (!confirm(`Excluir "${product.name}"?`)) return;

    setError(null);
    const { response, data } = await fetchJson<{ ok?: boolean; error?: string }>(
      `/api/admin/institutions/${institutionId}/products/${product.id}`,
      { method: "DELETE" },
    );

    if (!response.ok) {
      setError(data?.error ?? "Erro ao excluir produto.");
      return;
    }

    setProducts((prev) => prev.filter((item) => item.id !== product.id));
    setEditProduct(null);
    setEditForm(null);
  }

  return (
    <>
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Produtos e contas</CardTitle>
          <p className="text-sm text-zinc-500">
            Edite na tabela ou use Editar para o formulário completo.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <p className="py-6 text-sm text-zinc-500">Carregando produtos...</p>
          ) : (
            <SmartTable
              data={products}
              columns={columns}
              getRowKey={(row) => row.id}
              pageSize={10}
              searchPlaceholder="Buscar produtos…"
              searchFilter={(row, query) =>
                [row.name, row.slug, row.description ?? ""].some((field) =>
                  field.toLowerCase().includes(query),
                )
              }
              onCreate={() => {
                setCreateForm(emptyProductForm());
                setCreateOpen(true);
              }}
              createLabel="Novo produto"
              onEdit={(row) => {
                setEditProduct(row);
                setEditForm(productToForm(row));
              }}
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Novo produto / conta"
        size="lg"
        className="max-w-md"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void createProduct()}
              disabled={creating || !createForm.name.trim()}
            >
              {creating ? "Criando..." : "Criar"}
            </Button>
          </>
        }
      >
        <SmartTableModalFields
          columns={columns}
          form={createForm}
          isCreating
          saving={creating}
          onChange={(key, value) =>
            setCreateForm((prev) => applyProductFormField(prev, key, value))
          }
        />
      </Modal>

      <Modal
        open={editProduct !== null && editForm !== null}
        onClose={() => {
          setEditProduct(null);
          setEditForm(null);
        }}
        title={editProduct ? `Editar — ${editProduct.name}` : "Editar produto"}
        size="lg"
        className="max-w-md"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditProduct(null);
                setEditForm(null);
              }}
              disabled={savingEdit}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => editProduct && void deleteProduct(editProduct)}
              disabled={savingEdit}
            >
              <IconX size="sm" />
              Excluir
            </Button>
            <Button
              type="button"
              onClick={() => void saveEditProduct()}
              disabled={savingEdit || !editForm?.name.trim()}
            >
              {savingEdit ? "Salvando..." : "Salvar"}
            </Button>
          </>
        }
      >
        {editForm && editProduct ? (
          <SmartTableModalFields
            columns={columns}
            form={editForm}
            row={editProduct}
            saving={savingEdit}
            onChange={(key, value) =>
              setEditForm((prev) =>
                prev ? applyProductFormField(prev, key, value) : prev,
              )
            }
          />
        ) : null}
      </Modal>
    </>
  );
}
