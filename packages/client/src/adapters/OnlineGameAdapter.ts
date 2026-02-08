import type { GameAdapter, GameState, GameAction } from '@cashflow/shared';
import type { Socket } from 'socket.io-client';

export class OnlineGameAdapter implements GameAdapter {
  private state: GameState | null = null;
  private listeners: Set<(state: GameState) => void> = new Set();
  private handleStateUpdate: (data: { state: GameState }) => void;

  constructor(private socket: Socket) {
    // Listen for state updates from server
    this.handleStateUpdate = (data: { state: GameState }) => {
      this.state = data.state;
      this.listeners.forEach(l => l(data.state));
    };
    this.socket.on('game:state_update', this.handleStateUpdate);
  }

  getState(): GameState {
    if (!this.state) {
      throw new Error('OnlineGameAdapter: state not yet initialized. Call setInitialState() first.');
    }
    return this.state;
  }

  dispatch(action: GameAction): void {
    // Send action to server (server validates and broadcasts)
    this.socket.emit('game:action', { playerId: action.playerId, action });
  }

  subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setInitialState(state: GameState): void {
    this.state = state;
    this.listeners.forEach(l => l(state));
  }

  cleanup(): void {
    this.socket.off('game:state_update', this.handleStateUpdate);
    this.listeners.clear();
  }
}
