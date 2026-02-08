import type { Server, Socket } from 'socket.io';
import type { RoomManager } from '../rooms/RoomManager.js';
import type { GameManager } from '../game/GameManager.js';
import type { ClientToServerEvents, ServerToClientEvents } from './eventTypes.js';
import { setSocketPlayer, getPlayerBySocket, generateSessionToken, verifySessionToken } from './connectionHandler.js';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const MAX_NAME_LENGTH = 30;

function sanitizeName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim().replace(/[<>&"']/g, '');
  if (trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH) return null;
  return trimmed;
}

export function registerRoomHandler(
  io: IOServer,
  socket: IOSocket,
  roomManager: RoomManager,
  gameManager: GameManager,
): void {
  socket.on('room:create', (data) => {
    const { playerId, playerName, roomName, maxPlayers, mode } = data;

    const cleanRoomName = sanitizeName(roomName);
    if (!cleanRoomName) {
      socket.emit('error', { message: 'Invalid room name (1-30 characters, no HTML)' });
      return;
    }

    if (mode !== 'companion') {
      const cleanPlayerName = sanitizeName(playerName);
      if (!cleanPlayerName) {
        socket.emit('error', { message: 'Invalid player name (1-30 characters, no HTML)' });
        return;
      }
    }

    // Map this socket to the player
    setSocketPlayer(socket.id, playerId);

    const cleanPlayerName = sanitizeName(playerName) ?? '';
    let room;
    if (mode === 'companion') {
      // Companion mode: host is a spectator, not a player
      room = roomManager.createCompanionRoom(
        playerId,
        socket.id,
        cleanRoomName,
        maxPlayers,
      );
    } else {
      room = roomManager.createRoom(
        playerId,
        cleanPlayerName,
        socket.id,
        cleanRoomName,
        maxPlayers,
      );
    }

    // Join the socket.io room
    void socket.join(room.id);

    const sessionToken = generateSessionToken(playerId);
    socket.emit('room:created', { room, sessionToken });
  });

  socket.on('room:join', (data) => {
    const { playerId, playerName, roomId } = data;

    const cleanPlayerName = sanitizeName(playerName);
    if (!cleanPlayerName) {
      socket.emit('error', { message: 'Invalid player name (1-30 characters, no HTML)' });
      return;
    }

    // Map this socket to the player
    setSocketPlayer(socket.id, playerId);

    const result = roomManager.joinRoom(roomId, playerId, cleanPlayerName, socket.id);

    if ('error' in result) {
      socket.emit('error', { message: result.error });
      return;
    }

    // Join the socket.io room
    void socket.join(roomId);

    // Emit to the joining player
    const sessionToken = generateSessionToken(playerId);
    socket.emit('room:joined', { room: result, sessionToken });

    // Notify other players in the room
    socket.to(roomId).emit('room:player_joined', {
      room: result,
      playerId,
      playerName: cleanPlayerName,
    });
  });

  socket.on('room:leave', (data) => {
    const { playerId } = data;

    const authenticatedPlayer = getPlayerBySocket(socket.id);
    if (!authenticatedPlayer || authenticatedPlayer !== playerId) {
      socket.emit('error', { message: 'Unauthorized: socket does not own this player' });
      return;
    }

    const room = roomManager.getRoomByPlayer(playerId);
    if (!room) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }

    const roomId = room.id;
    const { room: updatedRoom, wasHost } = roomManager.leaveRoom(playerId);

    // Leave the socket.io room
    void socket.leave(roomId);

    if (updatedRoom) {
      // Notify remaining players
      io.to(roomId).emit('room:player_left', {
        room: updatedRoom,
        playerId,
        newHostId: wasHost ? updatedRoom.hostId : undefined,
      });
    } else {
      // Room was deleted
      io.to(roomId).emit('room:closed', {
        roomId,
        reason: 'All players left',
      });
    }
  });

  socket.on('room:list', () => {
    const rooms = roomManager.listRooms();
    socket.emit('room:list', { rooms });
  });

  socket.on('room:ready', (data) => {
    const { playerId, ready } = data;

    const authenticatedPlayer = getPlayerBySocket(socket.id);
    if (!authenticatedPlayer || authenticatedPlayer !== playerId) {
      socket.emit('error', { message: 'Unauthorized: socket does not own this player' });
      return;
    }

    const room = roomManager.setReady(playerId, ready);
    if (!room) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }

    io.to(room.id).emit('room:player_ready', {
      room,
      playerId,
      ready,
    });
  });

  socket.on('room:start', (data) => {
    const { playerId, roomId } = data;

    const authenticatedPlayer = getPlayerBySocket(socket.id);
    if (!authenticatedPlayer || authenticatedPlayer !== playerId) {
      socket.emit('error', { message: 'Unauthorized: socket does not own this player' });
      return;
    }

    const room = roomManager.getRoom(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Only the host can start
    if (room.hostId !== playerId) {
      socket.emit('error', { message: 'Only the host can start the game' });
      return;
    }

    if (room.mode === 'companion') {
      // Companion mode: need at least 2 players (host is not a player)
      if (room.players.length < 2) {
        socket.emit('error', { message: 'Need at least 2 players to start' });
        return;
      }
    } else {
      // Online mode: all players must be ready
      if (!roomManager.areAllReady(roomId)) {
        socket.emit('error', { message: 'Not all players are ready' });
        return;
      }
    }

    // Start the game
    const updatedRoom = roomManager.startGame(roomId);
    if (!updatedRoom) {
      socket.emit('error', { message: 'Failed to start game' });
      return;
    }

    // Create game session
    const session = gameManager.createSession(roomId, updatedRoom.players);
    const sanitizedState = session.getSanitizedState();

    // Emit to all players in the room
    io.to(roomId).emit('game:started', {
      state: sanitizedState,
      roomId,
    });
  });

  socket.on('room:reconnect', (data) => {
    const { playerId, sessionToken } = data;

    // Verify session token
    if (!verifySessionToken(playerId, sessionToken)) {
      socket.emit('error', { message: 'Invalid session token' });
      return;
    }

    // Find the room this player belongs to
    const room = roomManager.getRoomByPlayer(playerId);
    if (!room) {
      socket.emit('error', { message: 'No room found for this player' });
      return;
    }

    // Verify player is actually in this room
    const playerInfo = room.players.find((p) => p.id === playerId);
    if (!playerInfo) {
      socket.emit('error', { message: 'Player not found in room' });
      return;
    }

    // Update socket mapping
    setSocketPlayer(socket.id, playerId);

    // Update the player's socketId in the room
    roomManager.updatePlayerSocket(playerId, room.id, socket.id);

    // Re-join the socket.io room
    void socket.join(room.id);

    // Generate a new session token for subsequent reconnections
    const newSessionToken = generateSessionToken(playerId);

    // Get current game state if game is in progress
    let state;
    if (room.status === 'playing') {
      const session = gameManager.getSession(room.id);
      if (session) {
        state = session.getSanitizedState();
      }
    }

    // Send reconnection data to the reconnecting player
    const updatedRoom = roomManager.getRoom(room.id)!;
    socket.emit('room:reconnected', { room: updatedRoom, state, sessionToken: newSessionToken });

    // Notify other players
    io.to(room.id).emit('player:reconnected', {
      playerId,
      playerName: playerInfo.name,
    });
  });
}
