import type { SelectOption } from "@/components/ui/select";
import type { SerializedInstitutionProduct } from "@/lib/product-serializer";
import {
  institutionProductKindLabel,
  institutionProductKindOptions,
} from "@/lib/product-serializer";
import { slugifyInstitution } from "@/lib/institutions";
import type { SmartTableColumn } from "@/components/ui/smart-table";
import type { TranslateFn } from "@/i18n/translate";

export type InstitutionProductForm = {
  name: string;
  slug: string;
  kind: string;
  currencyCode: string;
  description: string;
  active: boolean;
};

export function emptyProductForm(): InstitutionProductForm {
  return {
    name: "",
    slug: "",
    kind: "CHECKING",
    currencyCode: "",
    description: "",
    active: true,
  };
}

export function productToForm(product: SerializedInstitutionProduct): InstitutionProductForm {
  return {
    name: product.name,
    slug: product.slug,
    kind: product.kind,
    currencyCode: product.currencyCode ?? "",
    description: product.description ?? "",
    active: product.active,
  };
}

export function applyProductFormField(
  form: InstitutionProductForm,
  key: string,
  value: unknown,
): InstitutionProductForm {
  const next = { ...form };

  if (key === "name") {
    next.name = String(value ?? "");
    if (!form.slug.trim()) {
      next.slug = slugifyInstitution(next.name);
    }
    return next;
  }

  if (key === "slug") {
    next.slug = String(value ?? "").trim().toLowerCase();
    return next;
  }

  if (key === "kind") {
    next.kind = String(value ?? "OTHER");
    return next;
  }

  if (key === "currencyCode") {
    next.currencyCode = String(value ?? "").trim().toUpperCase();
    return next;
  }

  if (key === "description") {
    next.description = String(value ?? "");
    return next;
  }

  if (key === "active") {
    next.active = Boolean(value);
    return next;
  }

  return next;
}

export function productFormPayload(form: InstitutionProductForm) {
  return {
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    kind: form.kind,
    currencyCode: form.currencyCode.trim() || null,
    description: form.description.trim() || undefined,
    active: form.active,
  };
}

export function buildInstitutionProductColumns(options: {
  t: TranslateFn;
  patchProduct: (
    id: string,
    body: Record<string, unknown>,
  ) => void | Promise<void>;
  currencyOptions: SelectOption[];
}): SmartTableColumn<SerializedInstitutionProduct>[] {
  const { t, patchProduct, currencyOptions } = options;

  return [
    {
      id: "name",
      header: t("admin.common.columns.name"),
      sortValue: (row) => row.name,
      field: {
        type: "text",
        scope: "both",
        formKey: "name",
        modalOrder: 1,
        getValue: (row) => row.name,
        placeholder: "Conta Global, CDB...",
        onSave: (row, value) => patchProduct(row.id, { name: String(value ?? "") }),
      },
    },
    {
      id: "slug",
      header: t("admin.common.columns.slug"),
      sortValue: (row) => row.slug,
      field: {
        type: "text",
        scope: "both",
        formKey: "slug",
        modalOrder: 2,
        getValue: (row) => row.slug,
        placeholder: "conta-global",
        onSave: (row, value) =>
          patchProduct(row.id, { slug: String(value ?? "").trim().toLowerCase() }),
      },
    },
    {
      id: "kind",
      header: t("admin.common.columns.kind"),
      sortValue: (row) => institutionProductKindLabel(row.kind),
      field: {
        type: "select",
        scope: "both",
        formKey: "kind",
        modalOrder: 3,
        getValue: (row) => row.kind,
        options: institutionProductKindOptions,
        onSave: (row, value) => patchProduct(row.id, { kind: String(value) }),
      },
    },
    {
      id: "currencyCode",
      header: t("admin.common.columns.currency"),
      sortValue: (row) => row.currencyCode ?? "",
      field: {
        type: "select",
        scope: "both",
        formKey: "currencyCode",
        modalOrder: 4,
        modalLabel: t("admin.common.columns.currency"),
        getValue: (row) => row.currencyCode ?? "",
        options: [{ key: "currency-any", value: "", label: "Qualquer" }, ...currencyOptions],
        onSave: (row, value) =>
          patchProduct(row.id, { currencyCode: String(value) || null }),
      },
    },
    {
      id: "description",
      header: t("admin.common.columns.description"),
      hidden: true,
      field: {
        type: "textarea",
        scope: "modal",
        formKey: "description",
        modalOrder: 5,
        getValue: (row) => row.description ?? "",
        placeholder: "Rendimento, liquidez, requisitos...",
      },
    },
    {
      id: "active",
      header: t("admin.common.active"),
      align: "center",
      sortValue: (row) => (row.active ? 1 : 0),
      field: {
        type: "boolean",
        scope: "both",
        formKey: "active",
        modalOrder: 6,
        modalLabel: t("admin.common.active"),
        hint: t("admin.common.active"),
        getValue: (row) => row.active,
        onSave: (row, value) => patchProduct(row.id, { active: Boolean(value) }),
      },
    },
  ];
}
