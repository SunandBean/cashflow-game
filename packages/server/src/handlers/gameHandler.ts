import type { Server, Socket } from 'socket.io';
import type { GameAction } from '@cashflow/shared';
import type { RoomManager } from '../rooms/RoomManager.js';
import type { GameManager } from '../game/GameManager.js';
import type { ClientToServerEvents, ServerToClientEvents } from './eventTypes.js';
import { getPlayerBySocket } from './connectionHandler.js';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Per-room promise chain for action serialization
const roomActionQueues = new Map<string, Promise<void>>();

function enqueueRoomAction(roomId: string, fn: () => void): void {
  const prev = roomActionQueues.get(roomId) ?? Promise.resolve();
  const next = prev.then(() => {
    fn();
  });
  roomActionQueues.set(roomId, next);
}

export function registerGameHandler(
  io: IOServer,
  socket: IOSocket,
  roomManager: RoomManager,
  gameManager: GameManager,
): void {
  socket.on('game:action', (data) => {
    const { playerId, action } = data;

    // Verify the socket owns this playerId
    const authenticatedPlayer = getPlayerBySocket(socket.id);
    if (!authenticatedPlayer || authenticatedPlayer !== playerId) {
      socket.emit('game:action_error', { error: 'Unauthorized: socket does not own this player' });
      return;
    }

    // Find the player's room
    const room = roomManager.getRoomByPlayer(playerId);
    if (!room) {
      socket.emit('game:action_error', { error: 'Not in a room' });
      return;
    }

    // Serialize actions per room to prevent race conditions
    enqueueRoomAction(room.id, () => {
      // Get the game session
      const session = gameManager.getSession(room.id);
      if (!session) {
        socket.emit('game:action_error', { error: 'No active game' });
        return;
      }

      // If the action is ROLL_DICE, generate server-side dice values
      let processedAction: GameAction = action;
      if (action.type === 'ROLL_DICE') {
        const diceValues = session.rollDice();
        processedAction = {
          ...action,
          diceValues,
        };
      }

      // Process the action
      const result = session.processAction(processedAction);

      if (!result.success) {
        socket.emit('game:action_error', {
          error: result.error ?? 'Action failed',
        });
        return;
      }

      // Update room activity timestamp
      roomManager.touchRoom(room.id);

      // Broadcast sanitized state to all players in the room
      const sanitizedState = session.getSanitizedState();
      io.to(room.id).emit('game:state_update', { state: sanitizedState });
    });
  });

  socket.on('game:get_state', (data) => {
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

    const session = gameManager.getSession(room.id);
    if (!session) {
      socket.emit('error', { message: 'No active game' });
      return;
    }

    const sanitizedState = session.getSanitizedState();
    socket.emit('game:state_update', { state: sanitizedState });
  });

  socket.on('game:get_valid_actions', (data) => {
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

    const session = gameManager.getSession(room.id);
    if (!session) {
      socket.emit('error', { message: 'No active game' });
      return;
    }

    const actions = session.getValidActions();
    socket.emit('game:valid_actions', { actions });
  });
}
