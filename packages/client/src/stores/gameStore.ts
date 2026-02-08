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
      // Clean up previous subscription
      if (unsubscribe) {
        unsubscribe();
      }

      // Set the initial state
      set({ adapter, gameState: adapter.getState() });

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
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      set({ adapter: null, gameState: null });
    },
  };
});
