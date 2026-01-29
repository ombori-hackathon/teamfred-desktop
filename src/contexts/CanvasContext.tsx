import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
}

interface CanvasContextType extends CanvasState {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setZoom: (zoom: number) => void;
  pan: (dx: number, dy: number) => void;
  setPan: (x: number, y: number) => void;
  screenToCanvas: (
    screenX: number,
    screenY: number
  ) => { x: number; y: number };
  canvasToScreen: (
    canvasX: number,
    canvasY: number
  ) => { x: number; y: number };
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CanvasState>({
    zoom: 1,
    panX: 0,
    panY: 0,
  });

  const zoomIn = useCallback(() => {
    setState((prev) => ({
      ...prev,
      zoom: Math.min(MAX_ZOOM, prev.zoom + ZOOM_STEP),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setState((prev) => ({
      ...prev,
      zoom: Math.max(MIN_ZOOM, prev.zoom - ZOOM_STEP),
    }));
  }, []);

  const resetZoom = useCallback(() => {
    setState({ zoom: 1, panX: 0, panY: 0 });
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setState((prev) => ({
      ...prev,
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom)),
    }));
  }, []);

  const pan = useCallback((dx: number, dy: number) => {
    setState((prev) => ({
      ...prev,
      panX: prev.panX + dx,
      panY: prev.panY + dy,
    }));
  }, []);

  const setPan = useCallback((x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      panX: x,
      panY: y,
    }));
  }, []);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => ({
      x: (screenX - state.panX) / state.zoom,
      y: (screenY - state.panY) / state.zoom,
    }),
    [state.zoom, state.panX, state.panY]
  );

  // Convert canvas coordinates to screen coordinates
  const canvasToScreen = useCallback(
    (canvasX: number, canvasY: number) => ({
      x: canvasX * state.zoom + state.panX,
      y: canvasY * state.zoom + state.panY,
    }),
    [state.zoom, state.panX, state.panY]
  );

  return (
    <CanvasContext.Provider
      value={{
        ...state,
        zoomIn,
        zoomOut,
        resetZoom,
        setZoom,
        pan,
        setPan,
        screenToCanvas,
        canvasToScreen,
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvas() {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error("useCanvas must be used within a CanvasProvider");
  }
  return context;
}

export { MIN_ZOOM, MAX_ZOOM };
