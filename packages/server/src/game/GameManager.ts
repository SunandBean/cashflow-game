import { GameSession } from './GameSession.js';
import type { RoomPlayer } from '../storage/InMemoryStore.js';

export class GameManager {
  private sessions: Map<string, GameSession> = new Map(); // roomId -> GameSession

  createSession(roomId: string, players: RoomPlayer[]): GameSession {
    const session = new GameSession(players);
    this.sessions.set(roomId, session);
    return session;
  }

  getSession(roomId: string): GameSession | undefined {
    return this.sessions.get(roomId);
  }

  deleteSession(roomId: string): void {
    this.sessions.delete(roomId);
  }
}
