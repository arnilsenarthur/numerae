"use client";

import { useCallback, useState } from "react";

/**
 * Aba controlada refletida na URL (ex.: /finance/overview).
 * A página deve usar um segmento catch-all opcional ([[...slug]]) e passar o
 * primeiro segmento como initialTab (já resolvido para slug em inglês).
 * Trocar de aba usa window.history.replaceState para não remontar a página.
 */
export function useUrlTab<T extends string>({
  basePath,
  validTabs,
  defaultTab,
  initialTab,
}: {
  basePath: string;
  validTabs: readonly T[];
  defaultTab: T;
  initialTab?: string | null;
}) {
  const resolvedInitial =
    initialTab && validTabs.includes(initialTab as T) ? (initialTab as T) : defaultTab;

  const [tab, setTabState] = useState<T>(resolvedInitial);

  const setTab = useCallback(
    (next: T) => {
      setTabState(next);
      window.history.replaceState(null, "", `${basePath}/${next}`);
    },
    [basePath],
  );

  return [tab, setTab] as const;
}
