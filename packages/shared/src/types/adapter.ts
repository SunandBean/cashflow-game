import type { GameState, GameAction } from './game.js';

export interface GameAdapter {
  getState(): GameState;
  dispatch(action: GameAction): void;
  subscribe(listener: (state: GameState) => void): () => void;
}
