import { useState, useCallback } from "react";

export interface HistoryEntry {
  type: "position" | "size" | "content" | "tags" | "create" | "delete";
  ideaId: number;
  before: unknown;
  after: unknown;
}

const MAX_HISTORY = 50;

export function useHistory() {
  const [past, setPast] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);

  const push = useCallback((entry: HistoryEntry) => {
    setPast((prev) => {
      const newPast = [...prev, entry];
      // Limit history size
      if (newPast.length > MAX_HISTORY) {
        return newPast.slice(-MAX_HISTORY);
      }
      return newPast;
    });
    // Clear future when new action is performed
    setFuture([]);
  }, []);

  const undo = useCallback((): HistoryEntry | null => {
    if (past.length === 0) return null;

    const entry = past[past.length - 1];
    setPast((prev) => prev.slice(0, -1));
    setFuture((prev) => [...prev, entry]);
    return entry;
  }, [past]);

  const redo = useCallback((): HistoryEntry | null => {
    if (future.length === 0) return null;

    const entry = future[future.length - 1];
    setFuture((prev) => prev.slice(0, -1));
    setPast((prev) => [...prev, entry]);
    return entry;
  }, [future]);

  const clear = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  return {
    push,
    undo,
    redo,
    clear,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
