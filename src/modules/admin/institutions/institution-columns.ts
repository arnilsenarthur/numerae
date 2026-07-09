import type { SelectOption } from "@/components/ui/select";
import type { SmartTableColumn } from "@/components/ui/smart-table";
import type { TranslateFn } from "@/i18n/translate";
import { institutionTypeOptions, translateInstitutionType } from "@/i18n/labels";
import type { SerializedInstitution } from "@/lib/institution-serializer";

export function buildInstitutionColumns(options: {
  t: TranslateFn;
  patchInstitution: (
    id: string,
    body: Record<string, unknown>,
  ) => void | Promise<void>;
  countryFormOptions: SelectOption[];
  resolveCountryName: (code: string) => string;
}): SmartTableColumn<SerializedInstitution>[] {
  const { t, patchInstitution, countryFormOptions, resolveCountryName } = options;

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
        placeholder: t("admin.institutions.placeholders.name"),
        onSave: (row, value) => patchInstitution(row.id, { name: String(value ?? "") }),
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
        placeholder: t("admin.institutions.placeholders.slug"),
        onSave: (row, value) =>
          patchInstitution(row.id, { slug: String(value ?? "").trim().toLowerCase() }),
      },
    },
    {
      id: "brandColor",
      header: t("admin.common.columns.color"),
      sortValue: (row) => row.brandColor ?? "",
      align: "center",
      field: {
        type: "color",
        scope: "both",
        formKey: "brandColor",
        modalOrder: 6,
        getValue: (row) => row.brandColor ?? "#10B981",
        onSave: (row, value) =>
          patchInstitution(row.id, { brandColor: String(value ?? "") || undefined }),
      },
    },
    {
      id: "type",
      header: t("admin.common.columns.kind"),
      sortValue: (row) => translateInstitutionType(row.type, t),
      field: {
        type: "select",
        scope: "both",
        formKey: "type",
        modalOrder: 3,
        getValue: (row) => row.type,
        options: institutionTypeOptions(t),
        onSave: (row, value) => patchInstitution(row.id, { type: String(value) }),
      },
    },
    {
      id: "country",
      header: t("admin.common.columns.country"),
      sortValue: (row) => resolveCountryName(row.countryCode),
      field: {
        type: "select",
        scope: "both",
        formKey: "countryCode",
        modalOrder: 4,
        modalLabel: t("admin.common.columns.country"),
        getValue: (row) => row.countryCode,
        options: countryFormOptions,
        onSave: (row, value) => patchInstitution(row.id, { countryCode: String(value) }),
      },
    },
    {
      id: "website",
      header: t("admin.common.columns.website"),
      hidden: true,
      field: {
        type: "text",
        scope: "modal",
        formKey: "website",
        modalOrder: 5,
        getValue: (row) => row.website ?? "",
        placeholder: t("admin.institutions.placeholders.website"),
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
        modalOrder: 7,
        getValue: (row) => row.description ?? "",
        placeholder: t("admin.institutions.placeholders.description"),
      },
    },
    {
      id: "active",
      header: t("admin.common.activeFeminine"),
      sortValue: (row) => (row.active ? 1 : 0),
      align: "center",
      field: {
        type: "boolean",
        scope: "both",
        formKey: "active",
        modalOrder: 8,
        modalLabel: t("admin.common.activeFeminine"),
        hint: t("admin.common.activeFeminine"),
        getValue: (row) => row.active,
        onSave: (row, value) => patchInstitution(row.id, { active: Boolean(value) }),
      },
    },
  ];
}
