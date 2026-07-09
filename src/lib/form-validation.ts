export type ValidatedFieldRef = {
  markSubmitted: () => void;
  isValid: boolean;
};

function scrollToElement(element: HTMLElement) {
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  if (typeof element.focus === "function") {
    element.focus({ preventScroll: true });
  }
}

export function scrollToFieldById(id: string, container?: ParentNode | null) {
  if (typeof document === "undefined") return;

  const root = container ?? document;
  const field = root.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  if (field) scrollToElement(field);
}

export function scrollToFirstInvalidField(container?: ParentNode | null) {
  if (typeof document === "undefined") return;

  const root = container ?? document;
  const invalid = root.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (!invalid) return;

  scrollToElement(invalid);
}

/** Marks all fields submitted; scrolls to the first invalid one when validation fails. */
export function validateFormFields(
  fields: ValidatedFieldRef[],
  container?: ParentNode | null,
): boolean {
  for (const field of fields) {
    field.markSubmitted();
  }

  const valid = fields.every((field) => field.isValid);
  if (!valid) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToFirstInvalidField(container));
    });
  }

  return valid;
}
