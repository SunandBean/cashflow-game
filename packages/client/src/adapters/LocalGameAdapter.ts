import type { GameAdapter, GameState, GameAction, ProfessionCard } from '@cashflow/shared';
import { createGame, processAction } from '@cashflow/shared';

export class LocalGameAdapter implements GameAdapter {
  private state: GameState;
  private listeners: Set<(state: GameState) => void> = new Set();

  constructor(players: { id: string; name: string }[], professions: ProfessionCard[]) {
    this.state = createGame(players, professions);
  }

  getState(): GameState {
    return this.state;
  }

  dispatch(action: GameAction): void {
    this.state = processAction(this.state, action);
    this.listeners.forEach((l) => l(this.state));
  }

  subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
