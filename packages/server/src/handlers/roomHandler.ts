import type { Server, Socket } from 'socket.io';
import type { RoomManager } from '../rooms/RoomManager.js';
import type { GameManager } from '../game/GameManager.js';
import type { ClientToServerEvents, ServerToClientEvents } from './eventTypes.js';
import { setSocketPlayer } from './connectionHandler.js';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerRoomHandler(
  io: IOServer,
  socket: IOSocket,
  roomManager: RoomManager,
  gameManager: GameManager,
): void {
  socket.on('room:create', (data) => {
    const { playerId, playerName, roomName, maxPlayers, mode } = data;

    // Map this socket to the player
    setSocketPlayer(socket.id, playerId);

    let room;
    if (mode === 'companion') {
      // Companion mode: host is a spectator, not a player
      room = roomManager.createCompanionRoom(
        playerId,
        socket.id,
        roomName,
        maxPlayers,
      );
    } else {
      room = roomManager.createRoom(
        playerId,
        playerName,
        socket.id,
        roomName,
        maxPlayers,
      );
    }

    // Join the socket.io room
    void socket.join(room.id);

    socket.emit('room:created', { room });
  });

  socket.on('room:join', (data) => {
    const { playerId, playerName, roomId } = data;

    // Map this socket to the player
    setSocketPlayer(socket.id, playerId);

    const result = roomManager.joinRoom(roomId, playerId, playerName, socket.id);

    if ('error' in result) {
      socket.emit('error', { message: result.error });
      return;
    }

    // Join the socket.io room
    void socket.join(roomId);

    // Emit to the joining player
    socket.emit('room:joined', { room: result });

    // Notify other players in the room
    socket.to(roomId).emit('room:player_joined', {
      room: result,
      playerId,
      playerName,
    });
  });

  socket.on('room:leave', (data) => {
    const { playerId } = data;

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
}
