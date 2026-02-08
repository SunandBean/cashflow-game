import { InMemoryStore, Room, RoomPlayer } from '../storage/InMemoryStore.js';
import { v4 as uuidv4 } from 'uuid';

export class RoomManager {
  constructor(private store: InMemoryStore) {}

  createRoom(
    hostId: string,
    hostName: string,
    hostSocketId: string,
    roomName: string,
    maxPlayers: number = 6,
  ): Room {
    const room: Room = {
      id: uuidv4(),
      name: roomName,
      hostId,
      players: [
        {
          id: hostId,
          name: hostName,
          socketId: hostSocketId,
          isReady: false,
        },
      ],
      maxPlayers: Math.min(Math.max(maxPlayers, 2), 6),
      status: 'waiting',
      mode: 'online',
      createdAt: Date.now(),
    };

    this.store.createRoom(room);
    this.store.setPlayerRoom(hostId, room.id);
    return room;
  }

  createCompanionRoom(
    hostId: string,
    hostSocketId: string,
    roomName: string,
    maxPlayers: number = 6,
  ): Room {
    const room: Room = {
      id: uuidv4(),
      name: roomName,
      hostId,
      players: [], // Host is NOT a player in companion mode (spectator)
      maxPlayers: Math.min(Math.max(maxPlayers, 2), 6),
      status: 'waiting',
      mode: 'companion',
      createdAt: Date.now(),
    };

    this.store.createRoom(room);
    return room;
  }

  joinRoom(
    roomId: string,
    playerId: string,
    playerName: string,
    socketId: string,
  ): Room | { error: string } {
    const room = this.store.getRoom(roomId);
    if (!room) {
      return { error: 'Room not found' };
    }

    if (room.status !== 'waiting') {
      return { error: 'Game already in progress' };
    }

    if (room.players.length >= room.maxPlayers) {
      return { error: 'Room is full' };
    }

    // Check if player is already in the room (reconnection)
    const existingPlayer = room.players.find((p) => p.id === playerId);
    if (existingPlayer) {
      // Update socket ID for reconnection
      existingPlayer.socketId = socketId;
      this.store.updateRoom(roomId, { players: [...room.players] });
      const updatedRoom = this.store.getRoom(roomId)!;
      return updatedRoom;
    }

    // Check if player is already in another room
    const existingRoomId = this.store.getPlayerRoom(playerId);
    if (existingRoomId && existingRoomId !== roomId) {
      return { error: 'Already in another room' };
    }

    const newPlayer: RoomPlayer = {
      id: playerId,
      name: playerName,
      socketId,
      isReady: false,
    };

    const updatedPlayers = [...room.players, newPlayer];
    this.store.updateRoom(roomId, { players: updatedPlayers });
    this.store.setPlayerRoom(playerId, roomId);

    return this.store.getRoom(roomId)!;
  }

  leaveRoom(playerId: string): { room: Room | null; wasHost: boolean } {
    const roomId = this.store.getPlayerRoom(playerId);
    if (!roomId) {
      return { room: null, wasHost: false };
    }

    const room = this.store.getRoom(roomId);
    if (!room) {
      this.store.removePlayerRoom(playerId);
      return { room: null, wasHost: false };
    }

    const wasHost = room.hostId === playerId;
    const updatedPlayers = room.players.filter((p) => p.id !== playerId);
    this.store.removePlayerRoom(playerId);

    if (updatedPlayers.length === 0) {
      // No players left, delete the room
      this.store.deleteRoom(roomId);
      return { room: null, wasHost };
    }

    // If host left, assign new host
    let newHostId = room.hostId;
    if (wasHost) {
      newHostId = updatedPlayers[0].id;
    }

    this.store.updateRoom(roomId, {
      players: updatedPlayers,
      hostId: newHostId,
    });

    return { room: this.store.getRoom(roomId)!, wasHost };
  }

  setReady(playerId: string, ready: boolean): Room | null {
    const roomId = this.store.getPlayerRoom(playerId);
    if (!roomId) return null;

    const room = this.store.getRoom(roomId);
    if (!room) return null;

    const updatedPlayers = room.players.map((p) =>
      p.id === playerId ? { ...p, isReady: ready } : p,
    );

    this.store.updateRoom(roomId, { players: updatedPlayers });
    return this.store.getRoom(roomId)!;
  }

  listRooms(): Room[] {
    return this.store.listRooms().filter((r) => r.status === 'waiting');
  }

  getRoom(roomId: string): Room | undefined {
    return this.store.getRoom(roomId);
  }

  getRoomByPlayer(playerId: string): Room | undefined {
    const roomId = this.store.getPlayerRoom(playerId);
    if (!roomId) return undefined;
    return this.store.getRoom(roomId);
  }

  areAllReady(roomId: string): boolean {
    const room = this.store.getRoom(roomId);
    if (!room) return false;
    if (room.players.length < 2) return false;
    return room.players.every((p) => p.isReady);
  }

  startGame(roomId: string): Room | null {
    const room = this.store.getRoom(roomId);
    if (!room) return null;

    this.store.updateRoom(roomId, { status: 'playing' });
    return this.store.getRoom(roomId)!;
  }
}
