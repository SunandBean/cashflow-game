import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createServer, type Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import { InMemoryStore } from '../storage/InMemoryStore.js';
import { RoomManager } from '../rooms/RoomManager.js';
import { GameManager } from '../game/GameManager.js';
import { registerConnectionHandler } from '../handlers/connectionHandler.js';
import { registerRoomHandler } from '../handlers/roomHandler.js';
import { registerGameHandler } from '../handlers/gameHandler.js';
import { registerChatHandler } from '../handlers/chatHandler.js';
import type { ClientToServerEvents, ServerToClientEvents } from '../handlers/eventTypes.js';
import { TurnPhase } from '@cashflow/shared';

type TypedClientSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

let httpServer: HttpServer;
let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
let port: number;
let store: InMemoryStore;
let roomManager: RoomManager;
let gameManager: GameManager;

function createClient(): TypedClientSocket {
  return ioc(`http://localhost:${port}`, {
    transports: ['websocket'],
    autoConnect: false,
  }) as TypedClientSocket;
}

function waitForEvent<T>(socket: TypedClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => {
    (socket as any).once(event, (data: T) => resolve(data));
  });
}

function connectClient(client: TypedClientSocket): Promise<void> {
  return new Promise((resolve) => {
    client.on('connect', () => resolve());
    client.connect();
  });
}

beforeAll(
  () =>
    new Promise<void>((resolve) => {
      httpServer = createServer();
      store = new InMemoryStore();
      roomManager = new RoomManager(store);
      gameManager = new GameManager();

      io = new SocketIOServer(httpServer, {
        cors: { origin: '*' },
      });

      io.on('connection', (socket) => {
        registerConnectionHandler(io, socket, roomManager, gameManager);
        registerRoomHandler(io, socket, roomManager, gameManager);
        registerGameHandler(io, socket, roomManager, gameManager);
        registerChatHandler(io, socket, roomManager);
      });

      httpServer.listen(0, () => {
        const addr = httpServer.address();
        port = typeof addr === 'object' && addr ? addr.port : 0;
        resolve();
      });
    }),
);

afterAll(
  () =>
    new Promise<void>((resolve) => {
      io.close();
      httpServer.close(() => resolve());
    }),
);

// Reset state between tests (but keep server running)
beforeEach(() => {
  // Create fresh store and managers for each test
  store = new InMemoryStore();
  roomManager = new RoomManager(store);
  gameManager = new GameManager();

  // We need to re-register handlers with fresh managers.
  // Remove all existing listeners and re-register on new connections.
  io.removeAllListeners('connection');
  io.on('connection', (socket) => {
    registerConnectionHandler(io, socket, roomManager, gameManager);
    registerRoomHandler(io, socket, roomManager, gameManager);
    registerGameHandler(io, socket, roomManager, gameManager);
    registerChatHandler(io, socket, roomManager);
  });
});

let clients: TypedClientSocket[] = [];

afterEach(() => {
  // Disconnect all clients created during the test
  for (const c of clients) {
    if (c.connected) c.disconnect();
  }
  clients = [];
});

function makeClient(): TypedClientSocket {
  const c = createClient();
  clients.push(c);
  return c;
}

// ── Helper: create room and get roomId ──

async function createRoomAndGetId(
  client: TypedClientSocket,
  playerId: string,
  playerName: string,
  opts?: { mode?: 'online' | 'companion'; maxPlayers?: number },
): Promise<string> {
  const eventPromise = waitForEvent<{ room: any }>(client, 'room:created');
  client.emit('room:create', {
    playerId,
    playerName,
    roomName: 'Test Room',
    maxPlayers: opts?.maxPlayers,
    mode: opts?.mode,
  });
  const { room } = await eventPromise;
  return room.id;
}

// ── Tests ──

describe('Socket.io Integration Tests', () => {
  // ── Room Management Flow ──

  describe('Room Management', () => {
    it('player creates a room and receives room:created', async () => {
      const c1 = makeClient();
      await connectClient(c1);

      const eventPromise = waitForEvent<{ room: any }>(c1, 'room:created');
      c1.emit('room:create', {
        playerId: 'p1',
        playerName: 'Alice',
        roomName: 'Room1',
      });
      const { room } = await eventPromise;

      expect(room).toBeDefined();
      expect(room.name).toBe('Room1');
      expect(room.players).toHaveLength(1);
      expect(room.mode).toBe('online');
    });

    it('second player joins and both get notified', async () => {
      const c1 = makeClient();
      const c2 = makeClient();
      await Promise.all([connectClient(c1), connectClient(c2)]);

      const roomId = await createRoomAndGetId(c1, 'p1', 'Alice');

      const joinedPromise = waitForEvent<{ room: any }>(c2, 'room:joined');
      const playerJoinedPromise = waitForEvent<{ room: any; playerId: string }>(
        c1,
        'room:player_joined',
      );

      c2.emit('room:join', { playerId: 'p2', playerName: 'Bob', roomId });

      const [joinedData, playerJoinedData] = await Promise.all([
        joinedPromise,
        playerJoinedPromise,
      ]);

      expect(joinedData.room.players).toHaveLength(2);
      expect(playerJoinedData.playerId).toBe('p2');
    });

    it('player leaves and others get notified', async () => {
      const c1 = makeClient();
      const c2 = makeClient();
      await Promise.all([connectClient(c1), connectClient(c2)]);

      const roomId = await createRoomAndGetId(c1, 'p1', 'Alice');

      const joinedPromise = waitForEvent(c2, 'room:joined');
      c2.emit('room:join', { playerId: 'p2', playerName: 'Bob', roomId });
      await joinedPromise;

      const leftPromise = waitForEvent<{ room: any; playerId: string }>(
        c1,
        'room:player_left',
      );

      c2.emit('room:leave', { playerId: 'p2' });
      const leftData = await leftPromise;

      expect(leftData.playerId).toBe('p2');
      expect(leftData.room.players).toHaveLength(1);
    });

    it('room list returns waiting rooms', async () => {
      const c1 = makeClient();
      await connectClient(c1);

      await createRoomAndGetId(c1, 'p1', 'Alice');

      const listPromise = waitForEvent<{ rooms: any[] }>(c1, 'room:list');
      c1.emit('room:list');
      const { rooms } = await listPromise;

      expect(rooms).toHaveLength(1);
      expect(rooms[0].status).toBe('waiting');
    });
  });

  // ── Game Start Flow ──

  describe('Game Start', () => {
    it('starts game after both players ready', async () => {
      const c1 = makeClient();
      const c2 = makeClient();
      await Promise.all([connectClient(c1), connectClient(c2)]);

      const roomId = await createRoomAndGetId(c1, 'p1', 'Alice');

      const joinedPromise = waitForEvent(c2, 'room:joined');
      c2.emit('room:join', { playerId: 'p2', playerName: 'Bob', roomId });
      await joinedPromise;

      // Both ready
      c1.emit('room:ready', { playerId: 'p1', ready: true });
      c2.emit('room:ready', { playerId: 'p2', ready: true });

      // Small delay to let ready events propagate
      await new Promise((r) => setTimeout(r, 50));

      const startedPromise = waitForEvent<{ state: any; roomId: string }>(
        c1,
        'game:started',
      );

      c1.emit('room:start', { playerId: 'p1', roomId });
      const { state, roomId: receivedRoomId } = await startedPromise;

      expect(receivedRoomId).toBe(roomId);
      expect(state).toBeDefined();
      expect(state.players).toHaveLength(2);
    });

    it('rejects start when not all players ready', async () => {
      const c1 = makeClient();
      const c2 = makeClient();
      await Promise.all([connectClient(c1), connectClient(c2)]);

      const roomId = await createRoomAndGetId(c1, 'p1', 'Alice');

      const joinedPromise = waitForEvent(c2, 'room:joined');
      c2.emit('room:join', { playerId: 'p2', playerName: 'Bob', roomId });
      await joinedPromise;

      // Only p1 ready
      c1.emit('room:ready', { playerId: 'p1', ready: true });
      await new Promise((r) => setTimeout(r, 50));

      const errorPromise = waitForEvent<{ message: string }>(c1, 'error');
      c1.emit('room:start', { playerId: 'p1', roomId });
      const { message } = await errorPromise;

      expect(message).toBe('Not all players are ready');
    });

    it('rejects start from non-host', async () => {
      const c1 = makeClient();
      const c2 = makeClient();
      await Promise.all([connectClient(c1), connectClient(c2)]);

      const roomId = await createRoomAndGetId(c1, 'p1', 'Alice');

      const joinedPromise = waitForEvent(c2, 'room:joined');
      c2.emit('room:join', { playerId: 'p2', playerName: 'Bob', roomId });
      await joinedPromise;

      const errorPromise = waitForEvent<{ message: string }>(c2, 'error');
      c2.emit('room:start', { playerId: 'p2', roomId });
      const { message } = await errorPromise;

      expect(message).toBe('Only the host can start the game');
    });
  });

  // ── Game Actions Flow ──

  describe('Game Actions', () => {
    async function startGame(
      c1: TypedClientSocket,
      c2: TypedClientSocket,
    ): Promise<{ roomId: string; state: any }> {
      const roomId = await createRoomAndGetId(c1, 'p1', 'Alice');

      const joinedPromise = waitForEvent(c2, 'room:joined');
      c2.emit('room:join', { playerId: 'p2', playerName: 'Bob', roomId });
      await joinedPromise;

      c1.emit('room:ready', { playerId: 'p1', ready: true });
      c2.emit('room:ready', { playerId: 'p2', ready: true });
      await new Promise((r) => setTimeout(r, 50));

      const startedPromise = waitForEvent<{ state: any; roomId: string }>(
        c1,
        'game:started',
      );
      c1.emit('room:start', { playerId: 'p1', roomId });
      const { state } = await startedPromise;

      return { roomId, state };
    }

    it('ROLL_DICE action triggers state_update with server-generated dice', async () => {
      const c1 = makeClient();
      const c2 = makeClient();
      await Promise.all([connectClient(c1), connectClient(c2)]);

      const { state } = await startGame(c1, c2);
      const currentPlayerId = state.players[state.currentPlayerIndex].id;

      const updatePromise = waitForEvent<{ state: any }>(
        c1,
        'game:state_update',
      );

      // Determine which client is the current player
      const currentClient = currentPlayerId === 'p1' ? c1 : c2;

      currentClient.emit('game:action', {
        playerId: currentPlayerId,
        action: {
          type: 'ROLL_DICE',
          playerId: currentPlayerId,
          diceValues: [0, 0] as [number, number], // server overrides with real values
          useBothDice: true,
        },
      });

      const { state: updatedState } = await updatePromise;
      expect(updatedState).toBeDefined();
      // State should have progressed
      expect(updatedState.log.length).toBeGreaterThan(state.log.length);
    });

    it('invalid action returns game:action_error', async () => {
      const c1 = makeClient();
      const c2 = makeClient();
      await Promise.all([connectClient(c1), connectClient(c2)]);

      const { state } = await startGame(c1, c2);
      const currentPlayerId = state.players[state.currentPlayerIndex].id;
      const currentClient = currentPlayerId === 'p1' ? c1 : c2;

      const errorPromise = waitForEvent<{ error: string }>(
        currentClient,
        'game:action_error',
      );

      // END_TURN is not valid when ROLL_DICE is expected
      currentClient.emit('game:action', {
        playerId: currentPlayerId,
        action: { type: 'END_TURN', playerId: currentPlayerId },
      });

      const { error } = await errorPromise;
      expect(error).toContain('Invalid action');
    });

    it('get_state returns sanitized state', async () => {
      const c1 = makeClient();
      const c2 = makeClient();
      await Promise.all([connectClient(c1), connectClient(c2)]);

      await startGame(c1, c2);

      const statePromise = waitForEvent<{ state: any }>(
        c1,
        'game:state_update',
      );
      c1.emit('game:get_state', { playerId: 'p1' });
      const { state } = await statePromise;

      expect(state).toBeDefined();
      expect(state.players).toHaveLength(2);
    });

    it('get_valid_actions returns action types', async () => {
      const c1 = makeClient();
      const c2 = makeClient();
      await Promise.all([connectClient(c1), connectClient(c2)]);

      await startGame(c1, c2);

      const actionsPromise = waitForEvent<{ actions: string[] }>(
        c1,
        'game:valid_actions',
      );
      c1.emit('game:get_valid_actions', { playerId: 'p1' });
      const { actions } = await actionsPromise;

      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
    });
  });

  // ── Deck Security ──

  describe('Deck Security', () => {
    it('game:started state does not contain real card data', async () => {
      const c1 = makeClient();
      const c2 = makeClient();
      await Promise.all([connectClient(c1), connectClient(c2)]);

      const roomId = await createRoomAndGetId(c1, 'p1', 'Alice');
      const joinedPromise = waitForEvent(c2, 'room:joined');
      c2.emit('room:join', { playerId: 'p2', playerName: 'Bob', roomId });
      await joinedPromise;

      c1.emit('room:ready', { playerId: 'p1', ready: true });
      c2.emit('room:ready', { playerId: 'p2', ready: true });
      await new Promise((r) => setTimeout(r, 50));

      const startedPromise = waitForEvent<{ state: any }>(c1, 'game:started');
      c1.emit('room:start', { playerId: 'p1', roomId });
      const { state } = await startedPromise;

      // All deck entries should be null (sanitized)
      for (const card of state.decks.smallDealDeck) {
        expect(card).toBeNull();
      }
      for (const card of state.decks.bigDealDeck) {
        expect(card).toBeNull();
      }
      for (const card of state.decks.marketDeck) {
        expect(card).toBeNull();
      }
      for (const card of state.decks.doodadDeck) {
        expect(card).toBeNull();
      }
    });

    it('state_update does not contain real card data', async () => {
      const c1 = makeClient();
      const c2 = makeClient();
      await Promise.all([connectClient(c1), connectClient(c2)]);

      const roomId = await createRoomAndGetId(c1, 'p1', 'Alice');
      const joinedPromise = waitForEvent(c2, 'room:joined');
      c2.emit('room:join', { playerId: 'p2', playerName: 'Bob', roomId });
      await joinedPromise;

      c1.emit('room:ready', { playerId: 'p1', ready: true });
      c2.emit('room:ready', { playerId: 'p2', ready: true });
      await new Promise((r) => setTimeout(r, 50));

      const startedPromise = waitForEvent<{ state: any }>(c1, 'game:started');
      c1.emit('room:start', { playerId: 'p1', roomId });
      const { state: initialState } = await startedPromise;

      // Now send a ROLL_DICE and check the state_update
      const currentPlayerId =
        initialState.players[initialState.currentPlayerIndex].id;
      const currentClient = currentPlayerId === 'p1' ? c1 : c2;

      const updatePromise = waitForEvent<{ state: any }>(
        c1,
        'game:state_update',
      );

      currentClient.emit('game:action', {
        playerId: currentPlayerId,
        action: {
          type: 'ROLL_DICE',
          playerId: currentPlayerId,
          diceValues: [0, 0] as [number, number],
          useBothDice: true,
        },
      });

      const { state: updatedState } = await updatePromise;

      for (const card of updatedState.decks.smallDealDeck) {
        expect(card).toBeNull();
      }
      for (const card of updatedState.decks.bigDealDeck) {
        expect(card).toBeNull();
      }
    });
  });

  // ── Companion Mode ──

  describe('Companion Mode', () => {
    it('companion room has no players initially (host is spectator)', async () => {
      const c1 = makeClient();
      await connectClient(c1);

      const eventPromise = waitForEvent<{ room: any }>(c1, 'room:created');
      c1.emit('room:create', {
        playerId: 'host1',
        playerName: 'Host',
        roomName: 'Companion Room',
        mode: 'companion',
      });
      const { room } = await eventPromise;

      expect(room.mode).toBe('companion');
      expect(room.players).toHaveLength(0);
    });

    it('companion mode starts with 2+ players', async () => {
      const cHost = makeClient();
      const c1 = makeClient();
      const c2 = makeClient();
      await Promise.all([connectClient(cHost), connectClient(c1), connectClient(c2)]);

      const roomId = await createRoomAndGetId(cHost, 'host1', 'Host', {
        mode: 'companion',
      });

      // Two players join
      const join1 = waitForEvent(c1, 'room:joined');
      c1.emit('room:join', { playerId: 'p1', playerName: 'Alice', roomId });
      await join1;

      const join2 = waitForEvent(c2, 'room:joined');
      c2.emit('room:join', { playerId: 'p2', playerName: 'Bob', roomId });
      await join2;

      // Host starts game
      const startedPromise = waitForEvent<{ state: any }>(
        cHost,
        'game:started',
      );
      cHost.emit('room:start', { playerId: 'host1', roomId });
      const { state } = await startedPromise;

      expect(state).toBeDefined();
      expect(state.players).toHaveLength(2);
    });

    it('companion mode fails to start with only 1 player', async () => {
      const cHost = makeClient();
      const c1 = makeClient();
      await Promise.all([connectClient(cHost), connectClient(c1)]);

      const roomId = await createRoomAndGetId(cHost, 'host1', 'Host', {
        mode: 'companion',
      });

      const join1 = waitForEvent(c1, 'room:joined');
      c1.emit('room:join', { playerId: 'p1', playerName: 'Alice', roomId });
      await join1;

      const errorPromise = waitForEvent<{ message: string }>(cHost, 'error');
      cHost.emit('room:start', { playerId: 'host1', roomId });
      const { message } = await errorPromise;

      expect(message).toBe('Need at least 2 players to start');
    });
  });

  // ── Error Cases ──

  describe('Error Cases', () => {
    it('action from unauthenticated player returns error', async () => {
      const c1 = makeClient();
      await connectClient(c1);

      const errorPromise = waitForEvent<{ error: string }>(
        c1,
        'game:action_error',
      );
      c1.emit('game:action', {
        playerId: 'nobody',
        action: { type: 'ROLL_DICE', playerId: 'nobody', diceValues: [0, 0] as [number, number], useBothDice: true },
      });
      const { error } = await errorPromise;

      expect(error).toBe('Unauthorized: socket does not own this player');
    });

    it('action when no game session exists returns error', async () => {
      const c1 = makeClient();
      await connectClient(c1);

      // Create room but don't start game
      const roomId = await createRoomAndGetId(c1, 'p1', 'Alice');

      const errorPromise = waitForEvent<{ error: string }>(
        c1,
        'game:action_error',
      );
      c1.emit('game:action', {
        playerId: 'p1',
        action: { type: 'ROLL_DICE', playerId: 'p1', diceValues: [0, 0] as [number, number], useBothDice: true },
      });
      const { error } = await errorPromise;

      expect(error).toBe('No active game');
    });

    it('join non-existent room returns error', async () => {
      const c1 = makeClient();
      await connectClient(c1);

      const errorPromise = waitForEvent<{ message: string }>(c1, 'error');
      c1.emit('room:join', {
        playerId: 'p1',
        playerName: 'Alice',
        roomId: 'fake-room',
      });
      const { message } = await errorPromise;

      expect(message).toBe('Room not found');
    });

    it('get_state from unauthenticated player returns error', async () => {
      const c1 = makeClient();
      await connectClient(c1);

      const errorPromise = waitForEvent<{ message: string }>(c1, 'error');
      c1.emit('game:get_state', { playerId: 'nobody' });
      const { message } = await errorPromise;

      expect(message).toBe('Unauthorized: socket does not own this player');
    });

    it('get_valid_actions without active game returns error', async () => {
      const c1 = makeClient();
      await connectClient(c1);

      // Create room but don't start game
      await createRoomAndGetId(c1, 'p1', 'Alice');

      const errorPromise = waitForEvent<{ message: string }>(c1, 'error');
      c1.emit('game:get_valid_actions', { playerId: 'p1' });
      const { message } = await errorPromise;

      expect(message).toBe('No active game');
    });
  });

  // ── V2 Actions: Bankruptcy, Player Deals ──

  describe('V2 Actions', () => {
    // Helper: start a 2-player game and return roomId, initial state, and current player info
    async function startGameForV2(
      c1: TypedClientSocket,
      c2: TypedClientSocket,
    ): Promise<{ roomId: string; state: any }> {
      const roomId = await createRoomAndGetId(c1, 'p1', 'Alice');

      const joinedPromise = waitForEvent(c2, 'room:joined');
      c2.emit('room:join', { playerId: 'p2', playerName: 'Bob', roomId });
      await joinedPromise;

      c1.emit('room:ready', { playerId: 'p1', ready: true });
      c2.emit('room:ready', { playerId: 'p2', ready: true });
      await new Promise((r) => setTimeout(r, 50));

      const startedPromise = waitForEvent<{ state: any; roomId: string }>(
        c1,
        'game:started',
      );
      c1.emit('room:start', { playerId: 'p1', roomId });
      const { state } = await startedPromise;

      return { roomId, state };
    }

    describe('DECLARE_BANKRUPTCY', () => {
      it('processes DECLARE_BANKRUPTCY when state is in BANKRUPTCY_DECISION phase', async () => {
        const c1 = makeClient();
        const c2 = makeClient();
        await Promise.all([connectClient(c1), connectClient(c2)]);

        const { roomId, state } = await startGameForV2(c1, c2);

        // Directly manipulate game session state to set up BANKRUPTCY_DECISION phase
        const session = gameManager.getSession(roomId)!;
        const currentPlayerId = session.getState().players[session.getState().currentPlayerIndex].id;
        (session as any).state = {
          ...session.getState(),
          turnPhase: TurnPhase.BANKRUPTCY_DECISION,
        };

        const currentClient = currentPlayerId === 'p1' ? c1 : c2;
        const updatePromise = waitForEvent<{ state: any }>(
          currentClient,
          'game:state_update',
        );

        currentClient.emit('game:action', {
          playerId: currentPlayerId,
          action: {
            type: 'DECLARE_BANKRUPTCY',
            playerId: currentPlayerId,
          },
        });

        const { state: updatedState } = await updatePromise;
        expect(updatedState).toBeDefined();
        // After bankruptcy, the turn phase should move to END_OF_TURN
        expect(updatedState.turnPhase).toBe(TurnPhase.END_OF_TURN);
        // Log should contain bankruptcy message
        const lastLogs = updatedState.log.slice(-2);
        const hasBankruptLog = lastLogs.some(
          (log: any) => log.message.includes('bankrupt') || log.message.includes('Bankruptcy') || log.message.includes('bankruptcy'),
        );
        expect(hasBankruptLog).toBe(true);
      });

      it('rejects DECLARE_BANKRUPTCY when not in BANKRUPTCY_DECISION phase', async () => {
        const c1 = makeClient();
        const c2 = makeClient();
        await Promise.all([connectClient(c1), connectClient(c2)]);

        const { state } = await startGameForV2(c1, c2);

        // Game starts in ROLL_DICE phase, so DECLARE_BANKRUPTCY should be rejected
        const currentPlayerId = state.players[state.currentPlayerIndex].id;
        const currentClient = currentPlayerId === 'p1' ? c1 : c2;

        const errorPromise = waitForEvent<{ error: string }>(
          currentClient,
          'game:action_error',
        );

        currentClient.emit('game:action', {
          playerId: currentPlayerId,
          action: {
            type: 'DECLARE_BANKRUPTCY',
            playerId: currentPlayerId,
          },
        });

        const { error } = await errorPromise;
        expect(error).toContain('Invalid action');
      });
    });

    describe('OFFER_DEAL_TO_PLAYER + ACCEPT_PLAYER_DEAL', () => {
      it('offers a deal to another player and accepts it via socket', async () => {
        const c1 = makeClient();
        const c2 = makeClient();
        await Promise.all([connectClient(c1), connectClient(c2)]);

        const { roomId } = await startGameForV2(c1, c2);

        // Set up game state: p1's turn, MAKE_DECISION phase with an active small deal card
        const session = gameManager.getSession(roomId)!;
        const p1Index = session.getState().players.findIndex((p: any) => p.id === 'p1');
        (session as any).state = {
          ...session.getState(),
          currentPlayerIndex: p1Index,
          turnPhase: TurnPhase.MAKE_DECISION,
          activeCard: {
            type: 'smallDeal' as const,
            card: {
              id: 'test-deal-card',
              title: 'Test Stock',
              deal: {
                type: 'stock' as const,
                name: 'Test Stock',
                symbol: 'OK4U',
                costPerShare: 10,
                dividendPerShare: 0,
                historicalPriceRange: { low: 5, high: 30 },
                description: 'Test stock deal',
                rule: 'Buy shares at this price.',
              },
            },
          },
          pendingPlayerDeal: null,
        };

        // P1 offers deal to P2 — both clients receive the broadcast
        const offerUpdateC1 = waitForEvent<{ state: any }>(c1, 'game:state_update');
        const offerUpdateC2 = waitForEvent<{ state: any }>(c2, 'game:state_update');

        c1.emit('game:action', {
          playerId: 'p1',
          action: {
            type: 'OFFER_DEAL_TO_PLAYER',
            playerId: 'p1',
            targetPlayerId: 'p2',
            askingPrice: 500,
          },
        });

        const [{ state: offerState }] = await Promise.all([offerUpdateC1, offerUpdateC2]);
        expect(offerState.turnPhase).toBe(TurnPhase.WAITING_FOR_DEAL_RESPONSE);
        expect(offerState.pendingPlayerDeal).toBeDefined();
        expect(offerState.pendingPlayerDeal.sellerId).toBe('p1');
        expect(offerState.pendingPlayerDeal.buyerId).toBe('p2');
        expect(offerState.pendingPlayerDeal.askingPrice).toBe(500);

        // P2 accepts the deal — set up listener AFTER the offer broadcast has been consumed
        const acceptUpdatePromise = waitForEvent<{ state: any }>(
          c2,
          'game:state_update',
        );

        c2.emit('game:action', {
          playerId: 'p2',
          action: {
            type: 'ACCEPT_PLAYER_DEAL',
            playerId: 'p2',
          },
        });

        const { state: acceptState } = await acceptUpdatePromise;
        expect(acceptState.turnPhase).toBe(TurnPhase.END_OF_TURN);
        expect(acceptState.pendingPlayerDeal).toBeNull();
        // Log should contain acceptance message
        const hasAcceptLog = acceptState.log.some(
          (log: any) => log.message.includes('accepted'),
        );
        expect(hasAcceptLog).toBe(true);
      });

      it('rejects OFFER_DEAL_TO_PLAYER when not in MAKE_DECISION phase', async () => {
        const c1 = makeClient();
        const c2 = makeClient();
        await Promise.all([connectClient(c1), connectClient(c2)]);

        const { state } = await startGameForV2(c1, c2);

        // Game starts in ROLL_DICE phase
        const currentPlayerId = state.players[state.currentPlayerIndex].id;
        const currentClient = currentPlayerId === 'p1' ? c1 : c2;

        const errorPromise = waitForEvent<{ error: string }>(
          currentClient,
          'game:action_error',
        );

        currentClient.emit('game:action', {
          playerId: currentPlayerId,
          action: {
            type: 'OFFER_DEAL_TO_PLAYER',
            playerId: currentPlayerId,
            targetPlayerId: currentPlayerId === 'p1' ? 'p2' : 'p1',
            askingPrice: 500,
          },
        });

        const { error } = await errorPromise;
        expect(error).toContain('Invalid action');
      });

      it('rejects ACCEPT_PLAYER_DEAL when not in WAITING_FOR_DEAL_RESPONSE phase', async () => {
        const c1 = makeClient();
        const c2 = makeClient();
        await Promise.all([connectClient(c1), connectClient(c2)]);

        await startGameForV2(c1, c2);

        const errorPromise = waitForEvent<{ error: string }>(
          c2,
          'game:action_error',
        );

        c2.emit('game:action', {
          playerId: 'p2',
          action: {
            type: 'ACCEPT_PLAYER_DEAL',
            playerId: 'p2',
          },
        });

        const { error } = await errorPromise;
        expect(error).toContain('Invalid action');
      });
    });

    describe('DECLINE_PLAYER_DEAL', () => {
      it('declines a deal offer and returns to MAKE_DECISION phase', async () => {
        const c1 = makeClient();
        const c2 = makeClient();
        await Promise.all([connectClient(c1), connectClient(c2)]);

        const { roomId } = await startGameForV2(c1, c2);

        // Set up game state: WAITING_FOR_DEAL_RESPONSE with a pending deal
        const session = gameManager.getSession(roomId)!;
        const p1Index = session.getState().players.findIndex((p: any) => p.id === 'p1');
        (session as any).state = {
          ...session.getState(),
          currentPlayerIndex: p1Index,
          turnPhase: TurnPhase.WAITING_FOR_DEAL_RESPONSE,
          activeCard: {
            type: 'smallDeal' as const,
            card: {
              id: 'test-deal-card',
              title: 'Test Stock',
              deal: {
                type: 'stock' as const,
                name: 'Test Stock',
                symbol: 'OK4U',
                costPerShare: 10,
                dividendPerShare: 0,
                historicalPriceRange: { low: 5, high: 30 },
                description: 'Test stock deal',
                rule: 'Buy shares at this price.',
              },
            },
          },
          pendingPlayerDeal: {
            sellerId: 'p1',
            buyerId: 'p2',
            card: {
              type: 'stock' as const,
              name: 'Test Stock',
              symbol: 'OK4U',
              costPerShare: 10,
              dividendPerShare: 0,
              historicalPriceRange: { low: 5, high: 30 },
              description: 'Test stock deal',
              rule: 'Buy shares at this price.',
            },
            askingPrice: 500,
          },
        };

        // P2 declines the deal
        const declineUpdatePromise = waitForEvent<{ state: any }>(
          c2,
          'game:state_update',
        );

        c2.emit('game:action', {
          playerId: 'p2',
          action: {
            type: 'DECLINE_PLAYER_DEAL',
            playerId: 'p2',
          },
        });

        const { state: declineState } = await declineUpdatePromise;
        expect(declineState.turnPhase).toBe(TurnPhase.MAKE_DECISION);
        expect(declineState.pendingPlayerDeal).toBeNull();
        // Log should contain decline message
        const hasDeclineLog = declineState.log.some(
          (log: any) => log.message.includes('declined'),
        );
        expect(hasDeclineLog).toBe(true);
      });

      it('rejects DECLINE_PLAYER_DEAL when not in WAITING_FOR_DEAL_RESPONSE phase', async () => {
        const c1 = makeClient();
        const c2 = makeClient();
        await Promise.all([connectClient(c1), connectClient(c2)]);

        await startGameForV2(c1, c2);

        const errorPromise = waitForEvent<{ error: string }>(
          c2,
          'game:action_error',
        );

        c2.emit('game:action', {
          playerId: 'p2',
          action: {
            type: 'DECLINE_PLAYER_DEAL',
            playerId: 'p2',
          },
        });

        const { error } = await errorPromise;
        expect(error).toContain('Invalid action');
      });

      it('rejects DECLINE_PLAYER_DEAL from wrong player (not the buyer)', async () => {
        const c1 = makeClient();
        const c2 = makeClient();
        await Promise.all([connectClient(c1), connectClient(c2)]);

        const { roomId } = await startGameForV2(c1, c2);

        // Set up WAITING_FOR_DEAL_RESPONSE where p2 is the buyer
        const session = gameManager.getSession(roomId)!;
        const p1Index = session.getState().players.findIndex((p: any) => p.id === 'p1');
        (session as any).state = {
          ...session.getState(),
          currentPlayerIndex: p1Index,
          turnPhase: TurnPhase.WAITING_FOR_DEAL_RESPONSE,
          pendingPlayerDeal: {
            sellerId: 'p1',
            buyerId: 'p2',
            card: {
              type: 'stock' as const,
              name: 'Test Stock',
              symbol: 'OK4U',
              costPerShare: 10,
              dividendPerShare: 0,
              historicalPriceRange: { low: 5, high: 30 },
              description: 'Test stock deal',
              rule: 'Buy shares at this price.',
            },
            askingPrice: 500,
          },
        };

        // P1 (seller) tries to decline - should fail because p1 is NOT the buyer
        const errorPromise = waitForEvent<{ error: string }>(
          c1,
          'game:action_error',
        );

        c1.emit('game:action', {
          playerId: 'p1',
          action: {
            type: 'DECLINE_PLAYER_DEAL',
            playerId: 'p1',
          },
        });

        const { error } = await errorPromise;
        expect(error).toContain('Invalid action');
      });
    });
  });
});
