import type { GameState, GameAction } from '@cashflow/shared';
import type { Room } from '../storage/InMemoryStore.js';

// ── Client-to-Server Events ──

export interface ClientToServerEvents {
  // Room events
  'room:create': (data: {
    playerId: string;
    playerName: string;
    roomName: string;
    maxPlayers?: number;
    mode?: 'online' | 'companion';
  }) => void;

  'room:join': (data: {
    playerId: string;
    playerName: string;
    roomId: string;
  }) => void;

  'room:leave': (data: {
    playerId: string;
  }) => void;

  'room:list': () => void;

  'room:ready': (data: {
    playerId: string;
    ready: boolean;
  }) => void;

  'room:start': (data: {
    playerId: string;
    roomId: string;
  }) => void;

  // Game events
  'game:action': (data: {
    playerId: string;
    action: GameAction;
  }) => void;

  'game:get_state': (data: {
    playerId: string;
  }) => void;

  'game:get_valid_actions': (data: {
    playerId: string;
  }) => void;

  // Chat events
  'chat:message': (data: {
    playerId: string;
    message: string;
  }) => void;
}

// ── Server-to-Client Events ──

export interface ServerToClientEvents {
  // Room events
  'room:created': (data: { room: Room }) => void;
  'room:joined': (data: { room: Room }) => void;
  'room:player_joined': (data: { room: Room; playerId: string; playerName: string }) => void;
  'room:player_left': (data: { room: Room; playerId: string; newHostId?: string }) => void;
  'room:list': (data: { rooms: Room[] }) => void;
  'room:player_ready': (data: { room: Room; playerId: string; ready: boolean }) => void;
  'room:closed': (data: { roomId: string; reason: string }) => void;

  // Game events
  'game:started': (data: { state: GameState; roomId: string }) => void;
  'game:state_update': (data: { state: GameState }) => void;
  'game:valid_actions': (data: { actions: GameAction['type'][] }) => void;
  'game:action_error': (data: { error: string }) => void;

  // Chat events
  'chat:message': (data: {
    playerId: string;
    playerName: string;
    message: string;
    timestamp: number;
  }) => void;

  // Connection events
  'error': (data: { message: string }) => void;
  'player:disconnected': (data: { playerId: string; playerName: string }) => void;
  'player:reconnected': (data: { playerId: string; playerName: string }) => void;
}
