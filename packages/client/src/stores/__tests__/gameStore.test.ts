import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { GameAdapter, GameState, GameAction } from '@cashflow/shared';
import { useGameStore } from '../gameStore';

function createMockAdapter(initialState: GameState): GameAdapter & { _triggerUpdate: (s: GameState) => void } {
  let listener: ((state: GameState) => void) | null = null;
  return {
    getState: vi.fn(() => initialState),
    dispatch: vi.fn(),
    subscribe: vi.fn((l: (state: GameState) => void) => {
      listener = l;
      return () => { listener = null; };
    }),
    _triggerUpdate(s: GameState) {
      listener?.(s);
    },
  };
}

describe('useGameStore', () => {
  beforeEach(() => {
    useGameStore.getState().cleanup();
  });

  it('has null initial state', () => {
    const { gameState, adapter } = useGameStore.getState();
    expect(gameState).toBeNull();
    expect(adapter).toBeNull();
  });

  it('setAdapter stores adapter and sets initial gameState', () => {
    const state = { id: 'gs1' } as unknown as GameState;
    const mockAdapter = createMockAdapter(state);
    useGameStore.getState().setAdapter(mockAdapter);

    expect(useGameStore.getState().adapter).toBe(mockAdapter);
    expect(useGameStore.getState().gameState).toBe(state);
    expect(mockAdapter.subscribe).toHaveBeenCalled();
  });

  it('updates gameState when adapter notifies', () => {
    const state1 = { id: 'gs1' } as unknown as GameState;
    const state2 = { id: 'gs2' } as unknown as GameState;
    const mockAdapter = createMockAdapter(state1);
    useGameStore.getState().setAdapter(mockAdapter);

    mockAdapter._triggerUpdate(state2);
    expect(useGameStore.getState().gameState).toBe(state2);
  });

  it('dispatch forwards to adapter.dispatch', () => {
    const state = { id: 'gs1' } as unknown as GameState;
    const mockAdapter = createMockAdapter(state);
    useGameStore.getState().setAdapter(mockAdapter);

    const action = { type: 'ROLL_DICE' } as unknown as GameAction;
    useGameStore.getState().dispatch(action);
    expect(mockAdapter.dispatch).toHaveBeenCalledWith(action);
  });

  it('dispatch is safe when no adapter is set', () => {
    expect(() =>
      useGameStore.getState().dispatch({ type: 'ROLL_DICE' } as unknown as GameAction)
    ).not.toThrow();
  });

  it('cleanup unsubscribes and nulls adapter/gameState', () => {
    const state = { id: 'gs1' } as unknown as GameState;
    const mockAdapter = createMockAdapter(state);
    useGameStore.getState().setAdapter(mockAdapter);

    useGameStore.getState().cleanup();

    expect(useGameStore.getState().adapter).toBeNull();
    expect(useGameStore.getState().gameState).toBeNull();

    // After cleanup, adapter updates should not affect store
    const state2 = { id: 'gs2' } as unknown as GameState;
    mockAdapter._triggerUpdate(state2);
    expect(useGameStore.getState().gameState).toBeNull();
  });

  it('setAdapter cleans up previous subscription', () => {
    const state1 = { id: 'gs1' } as unknown as GameState;
    const state2 = { id: 'gs2' } as unknown as GameState;
    const adapter1 = createMockAdapter(state1);
    const adapter2 = createMockAdapter(state2);

    useGameStore.getState().setAdapter(adapter1);
    useGameStore.getState().setAdapter(adapter2);

    // Old adapter updates should not affect store
    adapter1._triggerUpdate({ id: 'old' } as unknown as GameState);
    expect(useGameStore.getState().gameState).toBe(state2);
  });
});
