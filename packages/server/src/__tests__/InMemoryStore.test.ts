import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStore, Room } from '../storage/InMemoryStore.js';

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-1',
    name: 'Test Room',
    hostId: 'host-1',
    players: [
      { id: 'host-1', name: 'Host', socketId: 'sock-1', isReady: false },
    ],
    maxPlayers: 6,
    status: 'waiting',
    mode: 'online',
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    ...overrides,
  };
}

describe('InMemoryStore', () => {
  let store: InMemoryStore;

  beforeEach(() => {
    store = new InMemoryStore();
  });

  // ── Room CRUD ──

  it('creates and retrieves a room', () => {
    const room = makeRoom();
    store.createRoom(room);
    expect(store.getRoom('room-1')).toEqual(room);
  });

  it('returns undefined for non-existent room', () => {
    expect(store.getRoom('no-such-room')).toBeUndefined();
  });

  it('lists all rooms', () => {
    store.createRoom(makeRoom({ id: 'r1' }));
    store.createRoom(makeRoom({ id: 'r2' }));
    expect(store.listRooms()).toHaveLength(2);
  });

  it('updates a room partially', () => {
    store.createRoom(makeRoom());
    store.updateRoom('room-1', { name: 'Updated' });
    expect(store.getRoom('room-1')!.name).toBe('Updated');
    // Other fields preserved
    expect(store.getRoom('room-1')!.hostId).toBe('host-1');
  });

  it('updateRoom is a no-op for non-existent room', () => {
    // Should not throw
    store.updateRoom('no-room', { name: 'x' });
    expect(store.getRoom('no-room')).toBeUndefined();
  });

  it('deletes a room', () => {
    store.createRoom(makeRoom());
    store.deleteRoom('room-1');
    expect(store.getRoom('room-1')).toBeUndefined();
  });

  // ── Player-Room Mapping ──

  it('sets and gets player-room mapping', () => {
    store.setPlayerRoom('p1', 'room-1');
    expect(store.getPlayerRoom('p1')).toBe('room-1');
  });

  it('returns undefined for unmapped player', () => {
    expect(store.getPlayerRoom('unknown')).toBeUndefined();
  });

  it('removes player-room mapping', () => {
    store.setPlayerRoom('p1', 'room-1');
    store.removePlayerRoom('p1');
    expect(store.getPlayerRoom('p1')).toBeUndefined();
  });

  it('deleteRoom cleans up player-room mappings for all players in the room', () => {
    const room = makeRoom({
      players: [
        { id: 'p1', name: 'P1', socketId: 's1', isReady: false },
        { id: 'p2', name: 'P2', socketId: 's2', isReady: false },
      ],
    });
    store.createRoom(room);
    store.setPlayerRoom('p1', room.id);
    store.setPlayerRoom('p2', room.id);

    store.deleteRoom(room.id);

    expect(store.getPlayerRoom('p1')).toBeUndefined();
    expect(store.getPlayerRoom('p2')).toBeUndefined();
  });
});
