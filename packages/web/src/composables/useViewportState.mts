import { ref } from 'vue';

const STORAGE_KEY = 'encounter-viewport-state';

export interface ViewportState {
  zoom: number;
  pan: {
    x: number;
    y: number;
  };
  timestamp: number;
}

const currentViewportState = ref<ViewportState | null>(null);

export function useViewportState() {
  const loadStoredState = (): ViewportState | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored) as ViewportState;
      
      // Validate the stored state structure
      if (
        typeof parsed.zoom === 'number' &&
        typeof parsed.pan === 'object' &&
        typeof parsed.pan.x === 'number' &&
        typeof parsed.pan.y === 'number' &&
        typeof parsed.timestamp === 'number'
      ) {
        return parsed;
      }
      
      console.warn('[useViewportState] Invalid stored viewport state, clearing');
      localStorage.removeItem(STORAGE_KEY);
      return null;
    } catch (error) {
      console.error('[useViewportState] Error loading viewport state:', error);
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  };

  const saveViewportState = (zoom: number, panX: number, panY: number) => {
    const state: ViewportState = {
      zoom,
      pan: {
        x: panX,
        y: panY
      },
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      currentViewportState.value = state;
    } catch (error) {
      console.error('[useViewportState] Error saving viewport state:', error);
    }
  };

  const restoreViewportState = (): ViewportState | null => {
    if (currentViewportState.value) {
      return currentViewportState.value;
    }

    const stored = loadStoredState();
    if (stored) {
      currentViewportState.value = stored;
    }
    return stored;
  };

  const clearViewportState = () => {
    localStorage.removeItem(STORAGE_KEY);
    currentViewportState.value = null;
  };

  const hasViewportState = (): boolean => {
    return currentViewportState.value !== null || loadStoredState() !== null;
  };

  // Initialize current state from storage on first use
  if (!currentViewportState.value) {
    currentViewportState.value = loadStoredState();
  }

  return {
    saveViewportState,
    restoreViewportState,
    clearViewportState,
    hasViewportState,
    currentViewportState: currentViewportState.value
  };
}