import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useConnectionStore } from '../stores/connectionStore';
import { useGameStore } from '../stores/gameStore';

const SocketContext = createContext<Socket | null>(null);

export function useSocket(): Socket | null {
  return useContext(SocketContext);
}

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const socketRef = useRef<Socket | null>(null);
  const [socketState, setSocketState] = useState<Socket | null>(null);
  const setSocket = useConnectionStore((s) => s.setSocket);
  const setConnected = useConnectionStore((s) => s.setConnected);
  const setReconnecting = useConnectionStore((s) => s.setReconnecting);
  const playerId = useConnectionStore((s) => s.playerId);
  const isReconnecting = useConnectionStore((s) => s.isReconnecting);

  useEffect(() => {
    if (socketRef.current) return;

    const socket = io({
      // In dev the Vite proxy handles /socket.io -> localhost:3001
      // In production, connect to same origin
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;
    setSocketState(socket);
    setSocket(socket);

    socket.on('connect', () => {
      setConnected(true);
      setReconnecting(false);

      // On reconnect, try to resync game state
      const roomId = useConnectionStore.getState().currentRoomId;
      if (roomId) {
        socket.emit('game:get_state', { playerId });
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.io.on('reconnect_attempt', () => {
      setReconnecting(true);
    });

    socket.on('game:state_update', (data: { state: import('@cashflow/shared').GameState }) => {
      // If the game store has an adapter, let the adapter handle it.
      // If not, the adapter will handle it from OnlineGameAdapter.
      // This is a fallback for reconnection scenarios.
      const adapter = useGameStore.getState().adapter;
      if (!adapter) {
        // No adapter set yet, store could be in lobby/room phase
        return;
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SocketContext.Provider value={socketState}>
      {isReconnecting && (
        <div style={styles.reconnectBanner}>
          Reconnecting to server...
        </div>
      )}
      {children}
    </SocketContext.Provider>
  );
}

/** Wraps children in SocketProvider for use in routes. */
export function SocketWrapper({ children }: { children: ReactNode }) {
  return <SocketProvider>{children}</SocketProvider>;
}

const styles: Record<string, React.CSSProperties> = {
  reconnectBanner: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    padding: '8px 16px',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #e67e22, #d35400)',
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
};
