import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStore } from '../storage/InMemoryStore.js';
import { RoomManager } from '../rooms/RoomManager.js';

describe('RoomManager', () => {
  let store: InMemoryStore;
  let rm: RoomManager;

  beforeEach(() => {
    store = new InMemoryStore();
    rm = new RoomManager(store);
  });

  // ── Room Creation ──

  describe('createRoom (online)', () => {
    it('creates a room with host as the first player', () => {
      const room = rm.createRoom('h1', 'Host', 'sock-h1', 'My Room', 4);
      expect(room.name).toBe('My Room');
      expect(room.mode).toBe('online');
      expect(room.status).toBe('waiting');
      expect(room.hostId).toBe('h1');
      expect(room.maxPlayers).toBe(4);
      expect(room.players).toHaveLength(1);
      expect(room.players[0]).toMatchObject({
        id: 'h1',
        name: 'Host',
        socketId: 'sock-h1',
        isReady: false,
      });
    });

    it('stores the room and sets player-room mapping', () => {
      const room = rm.createRoom('h1', 'Host', 'sock-h1', 'R');
      expect(store.getRoom(room.id)).toBeDefined();
      expect(store.getPlayerRoom('h1')).toBe(room.id);
    });

    it('clamps maxPlayers to [2, 6]', () => {
      const r1 = rm.createRoom('h1', 'Host', 's1', 'R', 1);
      expect(r1.maxPlayers).toBe(2);

      const r2 = rm.createRoom('h2', 'Host', 's2', 'R', 10);
      expect(r2.maxPlayers).toBe(6);
    });
  });

  describe('createCompanionRoom', () => {
    it('creates a room with empty players array (host = spectator)', () => {
      const room = rm.createCompanionRoom('h1', 'sock-h1', 'Companion', 4);
      expect(room.mode).toBe('companion');
      expect(room.players).toHaveLength(0);
      expect(room.hostId).toBe('h1');
    });

    it('does NOT set player-room mapping for host (host is not a player)', () => {
      const room = rm.createCompanionRoom('h1', 'sock-h1', 'C');
      expect(store.getPlayerRoom('h1')).toBeUndefined();
      expect(store.getRoom(room.id)).toBeDefined();
    });
  });

  // ── Join Room ──

  describe('joinRoom', () => {
    it('adds a player to an existing room', () => {
      const room = rm.createRoom('h1', 'Host', 's1', 'R');
      const result = rm.joinRoom(room.id, 'p2', 'Player2', 's2');
      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.players).toHaveLength(2);
        expect(result.players[1]).toMatchObject({
          id: 'p2',
          name: 'Player2',
          socketId: 's2',
        });
      }
    });

    it('returns error for non-existent room', () => {
      const result = rm.joinRoom('no-room', 'p1', 'P', 's1');
      expect(result).toEqual({ error: 'Room not found' });
    });

    it('returns error when game is in progress', () => {
      const room = rm.createRoom('h1', 'Host', 's1', 'R');
      rm.startGame(room.id);
      const result = rm.joinRoom(room.id, 'p2', 'P2', 's2');
      expect(result).toEqual({ error: 'Game already in progress' });
    });

    it('returns error when room is full', () => {
      const room = rm.createRoom('h1', 'Host', 's1', 'R', 2);
      rm.joinRoom(room.id, 'p2', 'P2', 's2');
      const result = rm.joinRoom(room.id, 'p3', 'P3', 's3');
      expect(result).toEqual({ error: 'Room is full' });
    });

    it('updates socketId on reconnection (same playerId)', () => {
      const room = rm.createRoom('h1', 'Host', 's1', 'R');
      rm.joinRoom(room.id, 'p2', 'P2', 's2');

      const result = rm.joinRoom(room.id, 'p2', 'P2', 's2-new');
      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.players).toHaveLength(2);
        const p2 = result.players.find((p) => p.id === 'p2');
        expect(p2!.socketId).toBe('s2-new');
      }
    });

    it('returns error when player is already in another room', () => {
      const r1 = rm.createRoom('h1', 'Host', 's1', 'R1');
      rm.joinRoom(r1.id, 'p2', 'P2', 's2');

      const r2 = rm.createRoom('h2', 'Host2', 's3', 'R2');
      const result = rm.joinRoom(r2.id, 'p2', 'P2', 's4');
      expect(result).toEqual({ error: 'Already in another room' });
    });
  });

  // ── Leave Room ──

  describe('leaveRoom', () => {
    it('removes a non-host player', () => {
      const room = rm.createRoom('h1', 'Host', 's1', 'R');
      rm.joinRoom(room.id, 'p2', 'P2', 's2');

      const { room: updated, wasHost } = rm.leaveRoom('p2');
      expect(wasHost).toBe(false);
      expect(updated).not.toBeNull();
      expect(updated!.players).toHaveLength(1);
      expect(updated!.players[0].id).toBe('h1');
    });

    it('assigns new host when host leaves', () => {
      const room = rm.createRoom('h1', 'Host', 's1', 'R');
      rm.joinRoom(room.id, 'p2', 'P2', 's2');

      const { room: updated, wasHost } = rm.leaveRoom('h1');
      expect(wasHost).toBe(true);
      expect(updated!.hostId).toBe('p2');
    });

    it('deletes room when last player leaves', () => {
      const room = rm.createRoom('h1', 'Host', 's1', 'R');
      const { room: updated, wasHost } = rm.leaveRoom('h1');
      expect(wasHost).toBe(true);
      expect(updated).toBeNull();
      expect(store.getRoom(room.id)).toBeUndefined();
    });

    it('returns null room for player not in any room', () => {
      const { room } = rm.leaveRoom('nobody');
      expect(room).toBeNull();
    });

    it('cleans up player-room mapping on leave', () => {
      const room = rm.createRoom('h1', 'Host', 's1', 'R');
      rm.joinRoom(room.id, 'p2', 'P2', 's2');
      rm.leaveRoom('p2');
      expect(store.getPlayerRoom('p2')).toBeUndefined();
    });
  });

  // ── Ready / Start ──

  describe('setReady', () => {
    it('toggles player ready state', () => {
      const room = rm.createRoom('h1', 'Host', 's1', 'R');
      const updated = rm.setReady('h1', true);
      expect(updated).not.toBeNull();
      expect(updated!.players[0].isReady).toBe(true);

      const toggled = rm.setReady('h1', false);
      expect(toggled!.players[0].isReady).toBe(false);
    });

    it('returns null for player not in any room', () => {
      expect(rm.setReady('nobody', true)).toBeNull();
    });
  });

  describe('areAllReady', () => {
    it('returns false when fewer than 2 players', () => {
      const room = rm.createRoom('h1', 'Host', 's1', 'R');
      rm.setReady('h1', true);
      expect(rm.areAllReady(room.id)).toBe(false);
    });

    it('returns false when not all players are ready', () => {
      const room = rm.createRoom('h1', 'Host', 's1', 'R');
      rm.joinRoom(room.id, 'p2', 'P2', 's2');
      rm.setReady('h1', true);
      // p2 is not ready
      expect(rm.areAllReady(room.id)).toBe(false);
    });

    it('returns true when all players (>= 2) are ready', () => {
      const room = rm.createRoom('h1', 'Host', 's1', 'R');
      rm.joinRoom(room.id, 'p2', 'P2', 's2');
      rm.setReady('h1', true);
      rm.setReady('p2', true);
      expect(rm.areAllReady(room.id)).toBe(true);
    });

    it('returns false for non-existent room', () => {
      expect(rm.areAllReady('no-room')).toBe(false);
    });
  });

  describe('startGame', () => {
    it('sets room status to playing', () => {
      const room = rm.createRoom('h1', 'Host', 's1', 'R');
      const updated = rm.startGame(room.id);
      expect(updated).not.toBeNull();
      expect(updated!.status).toBe('playing');
    });

    it('returns null for non-existent room', () => {
      expect(rm.startGame('no-room')).toBeNull();
    });
  });

  // ── Listing ──

  describe('listRooms', () => {
    it('returns only waiting rooms', () => {
      const r1 = rm.createRoom('h1', 'Host1', 's1', 'Waiting');
      const r2 = rm.createRoom('h2', 'Host2', 's2', 'Playing');
      rm.startGame(r2.id);

      const list = rm.listRooms();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(r1.id);
    });

    it('returns empty array when no waiting rooms exist', () => {
      expect(rm.listRooms()).toEqual([]);
    });
  });

  // ── Getters ──

  describe('getRoom / getRoomByPlayer', () => {
    it('getRoom returns undefined for non-existent room', () => {
      expect(rm.getRoom('nope')).toBeUndefined();
    });

    it('getRoomByPlayer returns the room the player is in', () => {
      const room = rm.createRoom('h1', 'Host', 's1', 'R');
      expect(rm.getRoomByPlayer('h1')!.id).toBe(room.id);
    });

    it('getRoomByPlayer returns undefined for unknown player', () => {
      expect(rm.getRoomByPlayer('nobody')).toBeUndefined();
    });
  });
});
