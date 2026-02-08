import { describe, it, expect, beforeEach } from 'vitest';
import { GameManager } from '../game/GameManager.js';
import type { RoomPlayer } from '../storage/InMemoryStore.js';

const players: RoomPlayer[] = [
  { id: 'p1', name: 'Alice', socketId: 's1', isReady: true },
  { id: 'p2', name: 'Bob', socketId: 's2', isReady: true },
];

describe('GameManager', () => {
  let gm: GameManager;

  beforeEach(() => {
    gm = new GameManager();
  });

  it('creates a session and retrieves it', () => {
    const session = gm.createSession('room-1', players);
    expect(session).toBeDefined();
    expect(gm.getSession('room-1')).toBe(session);
  });

  it('returns undefined for non-existent session', () => {
    expect(gm.getSession('no-such-room')).toBeUndefined();
  });

  it('deletes a session', () => {
    gm.createSession('room-1', players);
    gm.deleteSession('room-1');
    expect(gm.getSession('room-1')).toBeUndefined();
  });

  it('manages multiple sessions independently', () => {
    const s1 = gm.createSession('room-1', players);
    const s2 = gm.createSession('room-2', players);

    expect(gm.getSession('room-1')).toBe(s1);
    expect(gm.getSession('room-2')).toBe(s2);

    gm.deleteSession('room-1');
    expect(gm.getSession('room-1')).toBeUndefined();
    expect(gm.getSession('room-2')).toBe(s2);
  });

  it('created session has valid game state with assigned professions', () => {
    const session = gm.createSession('room-1', players);
    const state = session.getState();
    expect(state.players).toHaveLength(2);
    expect(state.players[0].id).toBe('p1');
    expect(state.players[1].id).toBe('p2');
    expect(state.players[0].profession).toBeDefined();
  });
});
