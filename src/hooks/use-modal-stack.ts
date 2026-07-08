"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";

let stack: string[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return stack;
}

const MODAL_Z_BASE = 50;
const MODAL_Z_STEP = 20;
/** Must match modal EXIT_MS in modal.tsx */
const EXIT_DELAY_MS = 220;

export function getModalZIndex(layer: number, part: "backdrop" | "content") {
  const base = MODAL_Z_BASE + (layer - 1) * MODAL_Z_STEP;
  return part === "backdrop" ? base : base + 1;
}

export function useModalStackEntry(open: boolean) {
  const id = useId();
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      // Cancel any pending removal when re-opening.
      if (exitTimer.current !== null) {
        clearTimeout(exitTimer.current);
        exitTimer.current = null;
      }

      if (!stack.includes(id)) {
        stack = [...stack, id];
        emit();
      }
    } else {
      // Delay removal so the exit animation keeps the correct z-index.
      exitTimer.current = setTimeout(() => {
        exitTimer.current = null;
        stack = stack.filter((entry) => entry !== id);
        emit();
      }, EXIT_DELAY_MS);
    }

    return () => {
      if (exitTimer.current !== null) {
        clearTimeout(exitTimer.current);
        exitTimer.current = null;
      }
    };
  }, [open, id]);

  // Clean up fully on unmount regardless of open state.
  useEffect(() => {
    return () => {
      stack = stack.filter((entry) => entry !== id);
      emit();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentStack = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const layer = currentStack.includes(id) ? currentStack.indexOf(id) + 1 : 0;
  const isTop = open && currentStack[currentStack.length - 1] === id;
  const isBottom = open && currentStack[0] === id;

  return { layer, isTop, isBottom };
}
