import express, { type Express } from 'express';
import { createServer, type Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { InMemoryStore } from './storage/InMemoryStore.js';
import { RoomManager } from './rooms/RoomManager.js';
import { GameManager } from './game/GameManager.js';
import { registerConnectionHandler } from './handlers/connectionHandler.js';
import { registerRoomHandler } from './handlers/roomHandler.js';
import { registerGameHandler } from './handlers/gameHandler.js';
import { registerChatHandler } from './handlers/chatHandler.js';
import type { ClientToServerEvents, ServerToClientEvents } from './handlers/eventTypes.js';

const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const corsOrigins = CORS_ORIGIN.split(',').map((o) => o.trim());

const app: Express = express();
const httpServer: Server = createServer(app);
const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: corsOrigins }));
app.use(express.json());

// Initialize stores and managers
const store = new InMemoryStore();
const roomManager = new RoomManager(store);
const gameManager = new GameManager();

// Register socket handlers
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  registerConnectionHandler(io, socket, roomManager, gameManager);
  registerRoomHandler(io, socket, roomManager, gameManager);
  registerGameHandler(io, socket, roomManager, gameManager);
  registerChatHandler(io, socket, roomManager);
});

// REST endpoints
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/rooms', (_req, res) => {
  const rooms = roomManager.listRooms();
  res.json({ rooms });
});

// Periodic cleanup of stale rooms (every 5 minutes, rooms inactive for 30 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const STALE_ROOM_THRESHOLD_MS = 30 * 60 * 1000;

setInterval(() => {
  const staleRooms = roomManager.getStaleRooms(STALE_ROOM_THRESHOLD_MS);
  for (const room of staleRooms) {
    console.log(`Cleaning up stale room: ${room.id} (${room.name})`);
    gameManager.deleteSession(room.id);
    roomManager.deleteRoom(room.id);
    io.to(room.id).emit('room:closed', {
      roomId: room.id,
      reason: 'Room closed due to inactivity',
    });
  }
}, CLEANUP_INTERVAL_MS);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Cashflow 101 server running on port ${PORT}`);
});

export { app, httpServer, io };
