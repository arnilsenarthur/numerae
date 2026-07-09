import type { AppLocale } from "@/i18n/locales";
import { enUS } from "@/i18n/messages/en-US";
import { ptBR } from "@/i18n/messages/pt-BR";
import type { MessageTree } from "@/i18n/messages/types";

const catalogs: Record<AppLocale, MessageTree> = {
  "pt-BR": ptBR as MessageTree,
  "en-US": enUS as MessageTree,
};

export function getMessages(locale: AppLocale): MessageTree {
  return catalogs[locale];
}

export type { MessageTree, MessageValue } from "@/i18n/messages/types";
