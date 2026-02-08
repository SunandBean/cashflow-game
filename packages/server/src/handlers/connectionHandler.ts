import type { Server, Socket } from 'socket.io';
import type { RoomManager } from '../rooms/RoomManager.js';
import type { GameManager } from '../game/GameManager.js';
import type { ClientToServerEvents, ServerToClientEvents } from './eventTypes.js';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Map socketId -> playerId
const socketPlayerMap = new Map<string, string>();

export function setSocketPlayer(socketId: string, playerId: string): void {
  socketPlayerMap.set(socketId, playerId);
}

export function getPlayerBySocket(socketId: string): string | undefined {
  return socketPlayerMap.get(socketId);
}

export function removeSocket(socketId: string): void {
  socketPlayerMap.delete(socketId);
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
        // In game: keep the player slot but notify others of disconnection
        // Update socket ID to empty so we know they're disconnected
        const updatedPlayers = room.players.map((p) =>
          p.id === playerId ? { ...p, socketId: '' } : p,
        );
        roomManager.getRoom(room.id); // Ensure room exists
        // We only update socketId, player stays in room for reconnection
        const currentRoom = roomManager.getRoom(room.id);
        if (currentRoom) {
          currentRoom.players = updatedPlayers;
        }

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
