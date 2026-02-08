import type { Server, Socket } from 'socket.io';
import type { GameAction } from '@cashflow/shared';
import type { RoomManager } from '../rooms/RoomManager.js';
import type { GameManager } from '../game/GameManager.js';
import type { ClientToServerEvents, ServerToClientEvents } from './eventTypes.js';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerGameHandler(
  io: IOServer,
  socket: IOSocket,
  roomManager: RoomManager,
  gameManager: GameManager,
): void {
  socket.on('game:action', (data) => {
    const { playerId, action } = data;

    // Find the player's room
    const room = roomManager.getRoomByPlayer(playerId);
    if (!room) {
      socket.emit('game:action_error', { error: 'Not in a room' });
      return;
    }

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

    // Broadcast sanitized state to all players in the room
    const sanitizedState = session.getSanitizedState();
    io.to(room.id).emit('game:state_update', { state: sanitizedState });
  });

  socket.on('game:get_state', (data) => {
    const { playerId } = data;

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
