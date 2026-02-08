import type { Server, Socket } from 'socket.io';
import type { RoomManager } from '../rooms/RoomManager.js';
import type { ClientToServerEvents, ServerToClientEvents } from './eventTypes.js';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerChatHandler(
  io: IOServer,
  socket: IOSocket,
  roomManager: RoomManager,
): void {
  socket.on('chat:message', (data) => {
    const { playerId, message } = data;

    const room = roomManager.getRoomByPlayer(playerId);
    if (!room) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      socket.emit('error', { message: 'Player not found in room' });
      return;
    }

    // Broadcast the chat message to all players in the room
    io.to(room.id).emit('chat:message', {
      playerId,
      playerName: player.name,
      message,
      timestamp: Date.now(),
    });
  });
}
