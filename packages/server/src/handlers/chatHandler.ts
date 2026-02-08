import type { Server, Socket } from 'socket.io';
import type { RoomManager } from '../rooms/RoomManager.js';
import type { ClientToServerEvents, ServerToClientEvents } from './eventTypes.js';
import { getPlayerBySocket } from './connectionHandler.js';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const MAX_MESSAGE_LENGTH = 500;
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX_MESSAGES = 10;

// Per-socket rate limiting state
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(socketId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(socketId) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  rateLimitMap.set(socketId, recent);
  return recent.length > RATE_LIMIT_MAX_MESSAGES;
}

export function clearChatRateLimit(socketId: string): void {
  rateLimitMap.delete(socketId);
}

export function registerChatHandler(
  io: IOServer,
  socket: IOSocket,
  roomManager: RoomManager,
): void {
  socket.on('chat:message', (data) => {
    const { playerId, message } = data;

    const authenticatedPlayer = getPlayerBySocket(socket.id);
    if (!authenticatedPlayer || authenticatedPlayer !== playerId) {
      socket.emit('error', { message: 'Unauthorized: socket does not own this player' });
      return;
    }

    // Rate limiting
    if (isRateLimited(socket.id)) {
      socket.emit('error', { message: 'Too many messages. Please slow down.' });
      return;
    }

    // Validate and sanitize message
    if (typeof message !== 'string') {
      socket.emit('error', { message: 'Invalid message' });
      return;
    }

    const trimmed = message.trim();
    if (trimmed.length === 0) {
      socket.emit('error', { message: 'Message cannot be empty' });
      return;
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      socket.emit('error', { message: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` });
      return;
    }

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

    // Broadcast the sanitized chat message to all players in the room
    io.to(room.id).emit('chat:message', {
      playerId,
      playerName: player.name,
      message: trimmed,
      timestamp: Date.now(),
    });
  });

  // Clean up rate limit state on disconnect
  socket.on('disconnect', () => {
    clearChatRateLimit(socket.id);
  });
}
