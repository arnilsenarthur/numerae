/** Deterministic index for “tip of the day” — same tip all day, cycles as catalog grows. */
export function tipOfDayIndex(length: number, date = new Date()): number {
  if (length <= 0) return 0;

  const dayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(date);

  let hash = 0;
  for (let i = 0; i < dayKey.length; i++) {
    hash = (hash * 31 + dayKey.charCodeAt(i)) >>> 0;
  }

  return hash % length;
}

export const TIP_DISCLAIMER =
  "Conteúdo educativo. Não constitui recomendação de investimento.";
