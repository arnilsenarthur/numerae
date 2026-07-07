import { useCallback, useRef, useState } from "react";
import type { SerializedMoneyMapEdge, SerializedMoneyMapNode } from "@/lib/money-map-serializer";

export type MapSnapshot = {
  nodes: SerializedMoneyMapNode[];
  edges: SerializedMoneyMapEdge[];
};

export function useMoneyMapHistory(initial: MapSnapshot) {
  const [present, setPresent] = useState<MapSnapshot>(initial);
  const pastRef = useRef<MapSnapshot[]>([]);
  const futureRef = useRef<MapSnapshot[]>([]);
  const [meta, setMeta] = useState({ canUndo: false, canRedo: false });

  const syncMeta = () =>
    setMeta({
      canUndo: pastRef.current.length > 0,
      canRedo: futureRef.current.length > 0,
    });

  const reset = useCallback((snapshot: MapSnapshot) => {
    pastRef.current = [];
    futureRef.current = [];
    setPresent(snapshot);
    syncMeta();
  }, []);

  const setSnapshot = useCallback((value: MapSnapshot | ((prev: MapSnapshot) => MapSnapshot)) => {
    setPresent(value);
  }, []);

  const commit = useCallback((before: MapSnapshot) => {
    pastRef.current.push(before);
    futureRef.current = [];
    syncMeta();
  }, []);

  const pushPast = commit;

  const update = useCallback((updater: (current: MapSnapshot) => MapSnapshot) => {
    setPresent((current) => {
      pastRef.current.push(current);
      futureRef.current = [];
      syncMeta();
      return updater(current);
    });
  }, []);

  const undo = useCallback(() => {
    const past = pastRef.current;
    if (past.length === 0) return null;
    const previous = past.pop()!;
    setPresent((current) => {
      futureRef.current.unshift(current);
      syncMeta();
      return previous;
    });
    return previous;
  }, []);

  const redo = useCallback(() => {
    const future = futureRef.current;
    if (future.length === 0) return null;
    const next = future.shift()!;
    setPresent((current) => {
      pastRef.current.push(current);
      syncMeta();
      return next;
    });
    return next;
  }, []);

  return {
    snapshot: present,
    reset,
    setSnapshot,
    commit,
    pushPast,
    update,
    undo,
    redo,
    canUndo: meta.canUndo,
    canRedo: meta.canRedo,
  };
}
