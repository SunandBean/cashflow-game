export interface RoomPlayer {
  id: string;
  name: string;
  socketId: string;
  isReady: boolean;
}

export interface Room {
  id: string;
  name: string;
  hostId: string;
  players: RoomPlayer[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  mode: 'online' | 'companion';
  createdAt: number;
}

export class InMemoryStore {
  private rooms: Map<string, Room> = new Map();
  private playerRooms: Map<string, string> = new Map(); // playerId -> roomId

  createRoom(room: Room): void {
    this.rooms.set(room.id, room);
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  listRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  updateRoom(roomId: string, update: Partial<Room>): void {
    const room = this.rooms.get(roomId);
    if (room) {
      this.rooms.set(roomId, { ...room, ...update });
    }
  }

  deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      // Clean up player-room mappings for all players in the room
      for (const player of room.players) {
        this.playerRooms.delete(player.id);
      }
    }
    this.rooms.delete(roomId);
  }

  setPlayerRoom(playerId: string, roomId: string): void {
    this.playerRooms.set(playerId, roomId);
  }

  getPlayerRoom(playerId: string): string | undefined {
    return this.playerRooms.get(playerId);
  }

  removePlayerRoom(playerId: string): void {
    this.playerRooms.delete(playerId);
  }
}
