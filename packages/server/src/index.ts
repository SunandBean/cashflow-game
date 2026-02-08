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

const app: Express = express();
const httpServer: Server = createServer(app);
const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
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

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Cashflow 101 server running on port ${PORT}`);
});

export { app, httpServer, io };
