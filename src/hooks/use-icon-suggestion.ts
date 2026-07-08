"use client";

import { useCallback, useMemo, useState } from "react";
import { suggestIcon, type IconName } from "@/lib/icon-utils";

type IconSuggestionPurpose = "goal" | "transaction";

export function useIconSuggestion({
  text,
  category,
  purpose = "transaction",
}: {
  text: string;
  category?: string | null;
  purpose?: IconSuggestionPurpose;
}) {
  const [manualIcon, setManualIcon] = useState<IconName | null>(null);

  const suggested = useMemo(
    () => suggestIcon(text, category, { purpose }),
    [text, category, purpose],
  );

  const icon = manualIcon ?? suggested;
  const isManual = manualIcon !== null;

  const pickIcon = useCallback((value: IconName) => {
    setManualIcon(value);
  }, []);

  const resetIconSuggestion = useCallback(() => {
    setManualIcon(null);
  }, []);

  const lockIcon = useCallback((value: IconName) => {
    setManualIcon(value);
  }, []);

  return {
    icon,
    suggested,
    isManual,
    pickIcon,
    resetIconSuggestion,
    lockIcon,
  };
}
