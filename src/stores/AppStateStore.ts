import { create } from 'zustand';

interface AppState {
  // Default states
  isAuthenticated: boolean;
  
  // Generic state container - can hold any additional state
  [key: string]: any;
}

interface AppStateStore extends AppState {
  // Update any part of the state
  updateState: (updates: Partial<AppState>) => void;
  
  // Get current state
  getState: () => AppState;
  
  // Clear all state (useful for logout)
  clearState: () => void;
  
  // Reset to initial state
  resetState: () => void;
}

const initialState: AppState = {
  isAuthenticated: false,
  // Add more default states as needed
};

export const useAppStateStore = create<AppStateStore>((set, get) => ({
  ...initialState,
  
  updateState: (updates) => {
    set((state) => ({
      ...state,
      ...updates
    }));
  },
  
  getState: () => {
    const state = get();
    // Return only the state data, excluding functions
    const { updateState, getState, clearState, resetState, ...stateData } = state;
    return stateData as AppState;
  },
  
  clearState: () => {
    set(initialState);
  },
  
  resetState: () => {
    set({
      ...initialState,
      updateState: get().updateState,
      getState: get().getState,
      clearState: get().clearState,
      resetState: get().resetState,
    });
  },
}));

// Helper hook to access specific state values
export const useAppState = <T = any>(key: string): T => {
  return useAppStateStore((state) => state[key]);
};

// Helper to update state from outside React components
export const updateAppState = (updates: Partial<AppState>) => {
  useAppStateStore.getState().updateState(updates);
};

// Helper to get state from outside React components  
export const getAppState = () => {
  return useAppStateStore.getState().getState();
};