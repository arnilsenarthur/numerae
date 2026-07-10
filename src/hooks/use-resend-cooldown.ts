"use client";

import { useCallback, useEffect, useState } from "react";

export function useResendCooldown(seconds = 60) {
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  const startCooldown = useCallback(
    (overrideSeconds?: number) => {
      setCooldown(overrideSeconds ?? seconds);
    },
    [seconds],
  );

  return { cooldown, startCooldown, canResend: cooldown === 0 };
}
