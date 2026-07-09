import { slugifyInstitution } from "@/lib/institutions";
import type { SerializedInstitution } from "@/lib/institution-serializer";

export type InstitutionForm = {
  name: string;
  slug: string;
  type: string;
  countryCode: string;
  website: string;
  brandColor: string;
  description: string;
  active: boolean;
};

export const emptyInstitutionForm = (): InstitutionForm => ({
  name: "",
  slug: "",
  type: "FINTECH",
  countryCode: "BR",
  website: "",
  brandColor: "#10B981",
  description: "",
  active: true,
});

export function institutionToForm(record: SerializedInstitution): InstitutionForm {
  return {
    name: record.name,
    slug: record.slug,
    type: record.type,
    countryCode: record.countryCode,
    website: record.website ?? "",
    brandColor: record.brandColor ?? "#10B981",
    description: record.description ?? "",
    active: record.active,
  };
}

export function institutionFormPayload(form: InstitutionForm) {
  return {
    ...form,
    website: form.website || undefined,
    brandColor: form.brandColor || undefined,
    description: form.description || undefined,
  };
}

export function applyInstitutionFormField(
  prev: InstitutionForm,
  key: string,
  value: unknown,
  options?: { autoSlug?: boolean },
): InstitutionForm {
  const next = { ...prev, [key]: value } as InstitutionForm;

  if (key === "name" && options?.autoSlug && !prev.slug) {
    next.slug = slugifyInstitution(String(value));
  }

  if (key === "slug" && typeof value === "string") {
    next.slug = value.toLowerCase();
  }

  return next;
}
