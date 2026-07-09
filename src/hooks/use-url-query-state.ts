"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function buildUrlWithQuery(pathname: string, params: URLSearchParams) {
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

type QueryPatch = Record<string, string | number | null | undefined>;

export function patchSearchParams(current: URLSearchParams, patch: QueryPatch) {
  const next = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === "") {
      next.delete(key);
      continue;
    }
    next.set(key, String(value));
  }
  return next;
}

export function useUrlQueryPatch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (patch: QueryPatch, method: "replace" | "push" = "replace") => {
      const next = patchSearchParams(searchParams, patch);
      const url = buildUrlWithQuery(pathname, next);
      if (method === "push") router.push(url);
      else router.replace(url);
    },
    [pathname, router, searchParams],
  );
}

export function useUrlQueryEnum<T extends string>({
  key,
  validValues,
  defaultValue,
  normalize,
}: {
  key: string;
  validValues: readonly T[];
  defaultValue: T;
  /** Aceita aliases legados na URL e converte para o valor canônico. */
  normalize?: (raw: string | null) => T;
}) {
  const searchParams = useSearchParams();
  const patchQuery = useUrlQueryPatch();

  const value = useMemo(() => {
    const raw = searchParams.get(key);
    if (normalize) {
      const normalized = normalize(raw);
      if ((validValues as readonly string[]).includes(normalized)) return normalized;
      return defaultValue;
    }
    if (raw && (validValues as readonly string[]).includes(raw)) return raw as T;
    return defaultValue;
  }, [searchParams, key, validValues, defaultValue, normalize]);

  const setValue = useCallback(
    (next: T) => {
      patchQuery({ [key]: next === defaultValue ? null : next });
    },
    [defaultValue, key, patchQuery],
  );

  return [value, setValue] as const;
}

/** Filtro de lista/tabela na URL; reseta `page` ao mudar. */
export function useUrlQueryFilter({
  key,
  defaultValue = "",
}: {
  key: string;
  defaultValue?: string;
}) {
  const searchParams = useSearchParams();
  const patchQuery = useUrlQueryPatch();

  const value = useMemo(
    () => searchParams.get(key) ?? defaultValue,
    [searchParams, key, defaultValue],
  );

  const setValue = useCallback(
    (next: string) => {
      patchQuery({
        [key]: next.trim() === "" || next === defaultValue ? null : next,
        page: null,
      });
    },
    [defaultValue, key, patchQuery],
  );

  return [value, setValue] as const;
}

export function useUrlQueryPage({
  key = "page",
  defaultPage = 0,
}: {
  key?: string;
  defaultPage?: number;
} = {}) {
  const searchParams = useSearchParams();
  const patchQuery = useUrlQueryPatch();

  const page = useMemo(() => {
    const raw = searchParams.get(key);
    if (!raw) return defaultPage;
    const oneBased = Number.parseInt(raw, 10);
    if (!Number.isFinite(oneBased) || oneBased < 1) return defaultPage;
    return oneBased - 1;
  }, [searchParams, key, defaultPage]);

  const setPage = useCallback(
    (zeroBased: number) => {
      const oneBased = zeroBased + 1;
      patchQuery({ [key]: oneBased <= 1 ? null : oneBased });
    },
    [key, patchQuery],
  );

  return [page, setPage] as const;
}

export function useUrlQueryString({
  key,
  defaultValue = "",
}: {
  key: string;
  defaultValue?: string;
}) {
  const searchParams = useSearchParams();
  const patchQuery = useUrlQueryPatch();

  const value = useMemo(() => searchParams.get(key) ?? defaultValue, [searchParams, key, defaultValue]);

  const setValue = useCallback(
    (next: string) => {
      patchQuery({ [key]: next.trim() === "" || next === defaultValue ? null : next });
    },
    [defaultValue, key, patchQuery],
  );

  return [value, setValue] as const;
}

export function useUrlQueryInt({
  key,
  defaultValue,
  min,
  max,
}: {
  key: string;
  defaultValue: number;
  min?: number;
  max?: number;
}) {
  const searchParams = useSearchParams();
  const patchQuery = useUrlQueryPatch();

  const value = useMemo(() => {
    const raw = searchParams.get(key);
    if (!raw) return defaultValue;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return defaultValue;
    if (min != null && n < min) return defaultValue;
    if (max != null && n > max) return defaultValue;
    return n;
  }, [searchParams, key, defaultValue, min, max]);

  const setValue = useCallback(
    (next: number) => {
      patchQuery({ [key]: next === defaultValue ? null : next });
    },
    [defaultValue, key, patchQuery],
  );

  return [value, setValue] as const;
}

export function queryParamKey(prefix: string | undefined, name: string) {
  return prefix ? `${prefix}_${name}` : name;
}
