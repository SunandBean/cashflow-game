import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GameState, GameAction } from '@cashflow/shared';

vi.mock('@cashflow/shared', async () => {
  const actual = await vi.importActual<typeof import('@cashflow/shared')>('@cashflow/shared');
  return {
    ...actual,
    createGame: vi.fn(),
    processAction: vi.fn(),
  };
});

import { createGame, processAction } from '@cashflow/shared';
import { LocalGameAdapter } from '../LocalGameAdapter.js';

const mockCreateGame = vi.mocked(createGame);
const mockProcessAction = vi.mocked(processAction);

describe('LocalGameAdapter', () => {
  const fakeState = { id: 'state1' } as unknown as GameState;
  const fakeState2 = { id: 'state2' } as unknown as GameState;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateGame.mockReturnValue(fakeState);
    mockProcessAction.mockReturnValue(fakeState2);
  });

  it('calls createGame in constructor with players and professions', () => {
    const players = [{ id: 'p1', name: 'Alice' }];
    const professions = [{ name: 'Engineer' }] as any;
    new LocalGameAdapter(players, professions);
    expect(mockCreateGame).toHaveBeenCalledWith(players, professions);
  });

  it('getState() returns the initial state from createGame', () => {
    const adapter = new LocalGameAdapter([], []);
    expect(adapter.getState()).toBe(fakeState);
  });

  it('dispatch() calls processAction and updates internal state', () => {
    const adapter = new LocalGameAdapter([], []);
    const action = { type: 'ROLL_DICE' } as unknown as GameAction;
    adapter.dispatch(action);
    expect(mockProcessAction).toHaveBeenCalledWith(fakeState, action);
    expect(adapter.getState()).toBe(fakeState2);
  });

  it('dispatch() notifies all subscribers with the new state', () => {
    const adapter = new LocalGameAdapter([], []);
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    adapter.subscribe(listener1);
    adapter.subscribe(listener2);

    adapter.dispatch({ type: 'END_TURN' } as unknown as GameAction);

    expect(listener1).toHaveBeenCalledWith(fakeState2);
    expect(listener2).toHaveBeenCalledWith(fakeState2);
  });

  it('unsubscribe removes the listener', () => {
    const adapter = new LocalGameAdapter([], []);
    const listener = vi.fn();
    const unsub = adapter.subscribe(listener);
    unsub();

    adapter.dispatch({ type: 'END_TURN' } as unknown as GameAction);
    expect(listener).not.toHaveBeenCalled();
  });

  it('subscribe returns a unique unsubscribe function per listener', () => {
    const adapter = new LocalGameAdapter([], []);
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const unsub1 = adapter.subscribe(listener1);
    adapter.subscribe(listener2);

    unsub1(); // Only remove listener1
    adapter.dispatch({ type: 'END_TURN' } as unknown as GameAction);

    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledWith(fakeState2);
  });
});
