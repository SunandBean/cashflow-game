import { randomUUID } from 'crypto';
import type { Server, Socket } from 'socket.io';
import type { RoomManager } from '../rooms/RoomManager.js';
import type { GameManager } from '../game/GameManager.js';
import type { ClientToServerEvents, ServerToClientEvents } from './eventTypes.js';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Map socketId -> playerId
const socketPlayerMap = new Map<string, string>();

// Map playerId -> sessionToken (for reconnection auth)
const sessionTokenMap = new Map<string, string>();

export function setSocketPlayer(socketId: string, playerId: string): void {
  socketPlayerMap.set(socketId, playerId);
}

export function getPlayerBySocket(socketId: string): string | undefined {
  return socketPlayerMap.get(socketId);
}

export function removeSocket(socketId: string): void {
  socketPlayerMap.delete(socketId);
}

export function generateSessionToken(playerId: string): string {
  const token = randomUUID();
  sessionTokenMap.set(playerId, token);
  return token;
}

export function verifySessionToken(playerId: string, token: string): boolean {
  return sessionTokenMap.get(playerId) === token;
}

export function removeSessionToken(playerId: string): void {
  sessionTokenMap.delete(playerId);
}

export function registerConnectionHandler(
  io: IOServer,
  socket: IOSocket,
  roomManager: RoomManager,
  gameManager: GameManager,
): void {
  socket.on('disconnect', () => {
    const playerId = getPlayerBySocket(socket.id);
    if (!playerId) {
      removeSocket(socket.id);
      return;
    }

    // Find the room the player was in
    const room = roomManager.getRoomByPlayer(playerId);
    if (room) {
      const playerInfo = room.players.find((p) => p.id === playerId);
      const playerName = playerInfo?.name ?? 'Unknown';

      if (room.status === 'waiting') {
        // In lobby: remove the player from the room
        const { room: updatedRoom, wasHost } = roomManager.leaveRoom(playerId);

        if (updatedRoom) {
          // Notify remaining players
          io.to(room.id).emit('room:player_left', {
            room: updatedRoom,
            playerId,
            newHostId: wasHost ? updatedRoom.hostId : undefined,
          });
        } else {
          // Room was deleted (empty)
          io.to(room.id).emit('room:closed', {
            roomId: room.id,
            reason: 'All players left',
          });
        }
      } else if (room.status === 'playing') {
        // In game: keep the player slot but mark as disconnected via store
        roomManager.updatePlayerSocket(playerId, room.id, '');

        io.to(room.id).emit('player:disconnected', {
          playerId,
          playerName,
        });
      }
    }

    // Remove socket mapping but do NOT remove playerRoom mapping
    // so the player can reconnect during a game
    removeSocket(socket.id);
  });
}
