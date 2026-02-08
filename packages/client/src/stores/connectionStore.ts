import { create } from 'zustand';
import type { Socket } from 'socket.io-client';

function getOrCreatePlayerId(): string {
  // Use localStorage so the same browser always gets the same ID
  // (survives tab close, QR re-scan, etc.)
  let id = localStorage.getItem('cashflow_player_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('cashflow_player_id', id);
  }
  return id;
}

function getStoredPlayerName(): string {
  return localStorage.getItem('cashflow_player_name') || '';
}

interface ConnectionStore {
  socket: Socket | null;
  playerId: string;
  playerName: string;
  isConnected: boolean;
  isReconnecting: boolean;
  currentRoomId: string | null;
  role: 'player' | 'host' | null;
  setSocket: (socket: Socket) => void;
  setPlayerId: (id: string) => void;
  setPlayerName: (name: string) => void;
  setConnected: (connected: boolean) => void;
  setReconnecting: (reconnecting: boolean) => void;
  setCurrentRoomId: (roomId: string | null) => void;
  setRole: (role: 'player' | 'host' | null) => void;
  disconnect: () => void;
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  socket: null,
  playerId: getOrCreatePlayerId(),
  playerName: getStoredPlayerName(),
  isConnected: false,
  isReconnecting: false,
  currentRoomId: null,
  role: null,

  setSocket: (socket: Socket) => set({ socket }),

  setPlayerId: (id: string) => {
    localStorage.setItem('cashflow_player_id', id);
    set({ playerId: id });
  },

  setPlayerName: (name: string) => {
    localStorage.setItem('cashflow_player_name', name);
    set({ playerName: name });
  },

  setConnected: (connected: boolean) => set({ isConnected: connected }),

  setReconnecting: (reconnecting: boolean) => set({ isReconnecting: reconnecting }),

  setCurrentRoomId: (roomId: string | null) => set({ currentRoomId: roomId }),

  setRole: (role: 'player' | 'host' | null) => set({ role }),

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({ socket: null, isConnected: false, currentRoomId: null, role: null });
  },
}));
