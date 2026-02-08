import { create } from 'zustand';
import type { GameState, GameAction, GameAdapter } from '@cashflow/shared';

interface GameStore {
  gameState: GameState | null;
  adapter: GameAdapter | null;
  setAdapter: (adapter: GameAdapter) => void;
  dispatch: (action: GameAction) => void;
  cleanup: () => void;
}

export const useGameStore = create<GameStore>((set, get) => {
  let unsubscribe: (() => void) | null = null;

  return {
    gameState: null,
    adapter: null,

    setAdapter: (adapter: GameAdapter) => {
      // Clean up previous adapter's socket listeners
      const oldAdapter = get().adapter;
      if (oldAdapter && 'cleanup' in oldAdapter && typeof oldAdapter.cleanup === 'function') {
        oldAdapter.cleanup();
      }

      // Clean up previous subscription
      if (unsubscribe) {
        unsubscribe();
      }

      // Set the initial state (may be null for OnlineGameAdapter before state arrives)
      let initialState: GameState | null = null;
      try {
        initialState = adapter.getState();
      } catch {
        // Online adapter may not have state yet - that's OK, subscribe will handle it
      }
      set({ adapter, gameState: initialState });

      // Subscribe to future state changes
      unsubscribe = adapter.subscribe((state: GameState) => {
        set({ gameState: state });
      });
    },

    dispatch: (action: GameAction) => {
      const { adapter } = get();
      if (adapter) {
        adapter.dispatch(action);
      }
    },

    cleanup: () => {
      const oldAdapter = get().adapter;
      if (oldAdapter && 'cleanup' in oldAdapter && typeof oldAdapter.cleanup === 'function') {
        oldAdapter.cleanup();
      }
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      set({ adapter: null, gameState: null });
    },
  };
});
