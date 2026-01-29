import { useState, useCallback, useRef } from "react";

export interface LassoRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function useMultiSelect() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isLassoActive, setIsLassoActive] = useState(false);
  const [lassoRect, setLassoRect] = useState<LassoRect | null>(null);
  const lassoStartRef = useRef<{ x: number; y: number } | null>(null);

  const toggleSelect = useCallback((id: number, ctrlKey: boolean) => {
    if (ctrlKey) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const startLasso = useCallback((x: number, y: number) => {
    lassoStartRef.current = { x, y };
    setIsLassoActive(true);
    setLassoRect({ startX: x, startY: y, endX: x, endY: y });
  }, []);

  const updateLasso = useCallback((x: number, y: number) => {
    if (!lassoStartRef.current) return;
    setLassoRect({
      startX: lassoStartRef.current.x,
      startY: lassoStartRef.current.y,
      endX: x,
      endY: y,
    });
  }, []);

  const endLasso = useCallback(() => {
    setIsLassoActive(false);
    lassoStartRef.current = null;
  }, []);

  const selectIdsInLasso = useCallback((ids: number[]) => {
    setSelectedIds(ids);
  }, []);

  return {
    selectedIds,
    toggleSelect,
    setSelectedIds,
    clearSelection,
    isLassoActive,
    lassoRect,
    startLasso,
    updateLasso,
    endLasso,
    selectIdsInLasso,
  };
}
