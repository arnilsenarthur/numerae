import { getMessages, type MessageTree } from "@/i18n/messages";
import { DEFAULT_LOCALE, resolveAppLocale, type AppLocale } from "@/i18n/locales";

export type TranslateParams = Record<string, string | number>;

function getNestedValue(tree: MessageTree, key: string): string | undefined {
  const parts = key.split(".");
  let current: unknown = tree;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name];
    return value == null ? `{${name}}` : String(value);
  });
}

export type TranslateFn = (key: string, params?: TranslateParams) => string;

export function createTranslator(locale: AppLocale | string | null | undefined): TranslateFn {
  const resolved = resolveAppLocale(locale);
  const messages = getMessages(resolved);

  return function t(key: string, params?: TranslateParams): string {
    const raw = getNestedValue(messages, key) ?? getNestedValue(getMessages(DEFAULT_LOCALE), key);
    if (!raw) return key;
    return interpolate(raw, params);
  };
}
