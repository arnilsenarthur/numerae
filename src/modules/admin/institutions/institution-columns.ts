import type { SelectOption } from "@/components/ui/select";
import type { SmartTableColumn } from "@/components/ui/smart-table";
import type { SerializedInstitution } from "@/lib/institution-serializer";
import { institutionTypeLabel, institutionTypeOptions } from "./institution-form";

export function buildInstitutionColumns(options: {
  patchInstitution: (
    id: string,
    body: Record<string, unknown>,
  ) => void | Promise<void>;
  countryFormOptions: SelectOption[];
  resolveCountryName: (code: string) => string;
}): SmartTableColumn<SerializedInstitution>[] {
  const { patchInstitution, countryFormOptions, resolveCountryName } = options;

  return [
    {
      id: "name",
      header: "Nome",
      sortValue: (row) => row.name,
      field: {
        type: "text",
        scope: "both",
        formKey: "name",
        modalOrder: 1,
        getValue: (row) => row.name,
        placeholder: "Wise, Nubank...",
        onSave: (row, value) => patchInstitution(row.id, { name: String(value ?? "") }),
      },
    },
    {
      id: "slug",
      header: "Slug",
      sortValue: (row) => row.slug,
      field: {
        type: "text",
        scope: "both",
        formKey: "slug",
        modalOrder: 2,
        getValue: (row) => row.slug,
        placeholder: "wise",
        onSave: (row, value) =>
          patchInstitution(row.id, { slug: String(value ?? "").trim().toLowerCase() }),
      },
    },
    {
      id: "brandColor",
      header: "Cor",
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
      header: "Tipo",
      sortValue: (row) => institutionTypeLabel(row.type),
      field: {
        type: "select",
        scope: "both",
        formKey: "type",
        modalOrder: 3,
        getValue: (row) => row.type,
        options: institutionTypeOptions,
        onSave: (row, value) => patchInstitution(row.id, { type: String(value) }),
      },
    },
    {
      id: "country",
      header: "País",
      sortValue: (row) => resolveCountryName(row.countryCode),
      field: {
        type: "select",
        scope: "both",
        formKey: "countryCode",
        modalOrder: 4,
        modalLabel: "País",
        getValue: (row) => row.countryCode,
        options: countryFormOptions,
        onSave: (row, value) => patchInstitution(row.id, { countryCode: String(value) }),
      },
    },
    {
      id: "website",
      header: "Site",
      hidden: true,
      field: {
        type: "text",
        scope: "modal",
        formKey: "website",
        modalOrder: 5,
        getValue: (row) => row.website ?? "",
        placeholder: "https://...",
      },
    },
    {
      id: "description",
      header: "Descrição",
      hidden: true,
      field: {
        type: "textarea",
        scope: "modal",
        formKey: "description",
        modalOrder: 7,
        getValue: (row) => row.description ?? "",
        placeholder: "Notas internas sobre a instituição...",
      },
    },
    {
      id: "active",
      header: "Ativa",
      sortValue: (row) => (row.active ? 1 : 0),
      align: "center",
      field: {
        type: "boolean",
        scope: "both",
        formKey: "active",
        modalOrder: 8,
        modalLabel: "Ativa",
        hint: "Ativa",
        getValue: (row) => row.active,
        onSave: (row, value) => patchInstitution(row.id, { active: Boolean(value) }),
      },
    },
  ];
}

export { institutionTypeLabel };
