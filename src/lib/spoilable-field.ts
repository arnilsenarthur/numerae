export type SpoilableFieldFreshness = "never" | "fresh" | "warning" | "expired";

/** Default TTL for spoilable admin fields: 1 hour. */
export const DEFAULT_SPOILABLE_TTL_SECONDS = 3_600;

/** Default TTL for currency USD rates: 1 hour. */
export const DEFAULT_USD_RATE_TTL_SECONDS = DEFAULT_SPOILABLE_TTL_SECONDS;

/** Default TTL for institution exchange rates and spreads: 1 hour. */
export const DEFAULT_EXCHANGE_RATE_TTL_SECONDS = DEFAULT_SPOILABLE_TTL_SECONDS;

const WARNING_RATIO = 0.75;

export function getSpoilableFieldFreshness(
  updatedAt: Date | string | null | undefined,
  ttlSeconds: number,
  now = Date.now(),
): SpoilableFieldFreshness {
  if (!updatedAt || ttlSeconds <= 0) return "never";

  const updatedMs =
    typeof updatedAt === "string" ? new Date(updatedAt).getTime() : updatedAt.getTime();

  if (Number.isNaN(updatedMs)) return "never";

  const ageSeconds = (now - updatedMs) / 1000;

  if (ageSeconds >= ttlSeconds) return "expired";
  if (ageSeconds >= ttlSeconds * WARNING_RATIO) return "warning";
  return "fresh";
}

export function getSpoilableFieldMeta(
  updatedAt: Date | string | null | undefined,
  ttlSeconds: number,
  now = Date.now(),
) {
  const freshness = getSpoilableFieldFreshness(updatedAt, ttlSeconds, now);
  const updatedMs = updatedAt
    ? typeof updatedAt === "string"
      ? new Date(updatedAt).getTime()
      : updatedAt.getTime()
    : null;

  const ageSeconds =
    updatedMs && !Number.isNaN(updatedMs) ? Math.max(0, (now - updatedMs) / 1000) : null;

  const expiresInSeconds =
    ageSeconds !== null && ttlSeconds > 0
      ? Math.max(0, Math.round(ttlSeconds - ageSeconds))
      : null;

  return { freshness, ageSeconds, expiresInSeconds };
}

export function formatLastUpdated(
  updatedAt: Date | string | null | undefined,
  locale = "pt-BR",
) {
  if (!updatedAt) return "Nunca atualizado";

  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return "Nunca atualizado";

  return `Atualizado ${new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)}`;
}

export function formatTtlSeconds(ttlSeconds: number) {
  if (ttlSeconds < 60) return `${ttlSeconds}s`;
  if (ttlSeconds < 3600) return `${Math.round(ttlSeconds / 60)}min`;
  return `${Math.round(ttlSeconds / 3600)}h`;
}

export function formatTimeSinceUpdate(
  updatedAt: Date | string | null | undefined,
  ageSeconds: number | null,
) {
  if (!updatedAt || ageSeconds === null) return "Última atualização: nunca";

  const hours = Math.floor(ageSeconds / 3600);
  const minutes = Math.floor((ageSeconds % 3600) / 60);

  if (hours > 0) return `Última atualização: há ${hours}h ${minutes}min`;
  if (minutes > 0) return `Última atualização: há ${minutes}min`;
  return "Última atualização: agora";
}

export function formatValidade(expiresInSeconds: number | null, ttlSeconds: number) {
  if (ttlSeconds <= 0) return "Validade: sem prazo";

  if (expiresInSeconds === null) {
    return `Validade: ${formatTtlSeconds(ttlSeconds)} após salvar`;
  }

  if (expiresInSeconds <= 0) return "Validade: expirada";

  const hours = Math.floor(expiresInSeconds / 3600);
  const minutes = Math.floor((expiresInSeconds % 3600) / 60);

  if (hours > 0) return `Validade: expira em ${hours}h ${minutes}min`;
  return `Validade: expira em ${minutes}min`;
}

export function formatExpiresIn(expiresInSeconds: number | null, ttlSeconds?: number) {
  return formatValidade(expiresInSeconds, ttlSeconds ?? 0);
}

export const spoilableFieldControlClass: Record<SpoilableFieldFreshness, string> = {
  never: "border-amber-300 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-950/30",
  fresh: "border-amber-300 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-950/30",
  warning: "border-amber-400 bg-amber-50/70 dark:border-amber-600 dark:bg-amber-950/40",
  expired: "border-red-400 bg-red-50/70 dark:border-red-600 dark:bg-red-950/40",
};

/** Full table-cell background for TTL fields in SmartTable. */
export const spoilableFieldCellClass = {
  active: "bg-amber-100/90 dark:bg-amber-950/50",
  expired: "bg-red-100/90 dark:bg-red-950/50",
} as const;

export function getSpoilableFieldCellClass(
  updatedAt: Date | string | null | undefined,
  ttlSeconds: number,
  now = Date.now(),
) {
  if (ttlSeconds <= 0) return "";
  const { freshness } = getSpoilableFieldMeta(updatedAt, ttlSeconds, now);
  return freshness === "expired" ? spoilableFieldCellClass.expired : spoilableFieldCellClass.active;
}
