const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

export function formatDateISO(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function formatTimeISO(date: Date, withSeconds = false): string {
  const base = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  return withSeconds ? `${base}:${pad2(date.getSeconds())}` : base;
}

export function formatDateTimeISO(date: Date): string {
  return `${formatDateISO(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

export function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseTime(value?: string | null, withSeconds = false): Date | null {
  if (!value) return null;
  const pattern = withSeconds
    ? /^(\d{2}):(\d{2}):(\d{2})$/
    : /^(\d{2}):(\d{2})$/;
  const match = value.match(pattern);
  if (!match) return null;
  const date = new Date(1970, 0, 1, Number(match[1]), Number(match[2]), withSeconds ? Number(match[3]) : 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseDateTime(value?: string | null): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    match[6] ? Number(match[6]) : 0,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateDisplay(date: Date | null): {
  day: string;
  month: string;
  year: string;
} {
  if (!date) return { day: "DD", month: "MM", year: "AAAA" };
  return {
    day: pad2(date.getDate()),
    month: pad2(date.getMonth() + 1),
    year: date.getFullYear().toString(),
  };
}

export function formatTimeDisplay(date: Date | null, withSeconds = false): {
  hour: string;
  minute: string;
  second?: string;
} {
  if (!date) {
    return withSeconds
      ? { hour: "HH", minute: "MM", second: "SS" }
      : { hour: "HH", minute: "MM" };
  }

  const result = {
    hour: pad2(date.getHours()),
    minute: pad2(date.getMinutes()),
  };

  return withSeconds
    ? { ...result, second: pad2(date.getSeconds()) }
    : result;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function clampDate(date: Date, min?: Date | null, max?: Date | null): Date {
  let time = date.getTime();
  if (min && time < min.getTime()) time = min.getTime();
  if (max && time > max.getTime()) time = max.getTime();
  return new Date(time);
}

export { MONTHS_PT, DAYS_PT };
