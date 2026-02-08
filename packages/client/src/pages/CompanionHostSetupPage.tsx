import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import type { GameState } from '@cashflow/shared';
import { useSocket } from '../socket/SocketProvider.js';
import { useConnectionStore } from '../stores/connectionStore.js';
import { useGameStore } from '../stores/gameStore.js';
import { OnlineGameAdapter } from '../adapters/OnlineGameAdapter.js';
import type { Room } from '../types/room.js';
import { PLAYER_COLORS } from '../constants/colors.js';

function getCompanionUrl(roomId: string): string {
  // Use current hostname (LAN IP or localhost) for companion URL
  const host = window.location.hostname;
  const port = window.location.port;
  const protocol = window.location.protocol;
  return `${protocol}//${host}${port ? ':' + port : ''}/companion/${roomId}`;
}

export default function CompanionHostSetupPage() {
  const navigate = useNavigate();
  const socket = useSocket();
  const playerId = useConnectionStore((s) => s.playerId);
  const setCurrentRoomId = useConnectionStore((s) => s.setCurrentRoomId);
  const setRole = useConnectionStore((s) => s.setRole);
  const setAdapter = useGameStore((s) => s.setAdapter);

  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isConnected = useConnectionStore((s) => s.isConnected);
  const [roomCreated, setRoomCreated] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (data: { room: Room }) => {
      setRoom(data.room);
      setCurrentRoomId(data.room.id);
      setRole('host');
      setRoomCreated(true);
    };

    const handlePlayerJoined = (data: { room: Room }) => {
      setRoom(data.room);
    };

    const handlePlayerLeft = (data: { room: Room }) => {
      setRoom(data.room);
    };

    const handleGameStarted = (data: { state: GameState; roomId: string }) => {
      const adapter = new OnlineGameAdapter(socket);
      adapter.setInitialState(data.state);
      setAdapter(adapter);
      navigate(`/companion/host/game/${data.roomId}`);
    };

    const handleError = (data: { message: string }) => {
      setError(data.message);
    };

    socket.on('room:created', handleRoomCreated);
    socket.on('room:player_joined', handlePlayerJoined);
    socket.on('room:player_left', handlePlayerLeft);
    socket.on('game:started', handleGameStarted);
    socket.on('error', handleError);

    return () => {
      socket.off('room:created', handleRoomCreated);
      socket.off('room:player_joined', handlePlayerJoined);
      socket.off('room:player_left', handlePlayerLeft);
      socket.off('game:started', handleGameStarted);
      socket.off('error', handleError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // Create companion room once connected
  useEffect(() => {
    if (!socket || !isConnected || roomCreated) return;
    socket.emit('room:create', {
      playerId,
      playerName: 'Host',
      roomName: 'Companion Game',
      maxPlayers: 6,
      mode: 'companion' as const,
    });
  }, [socket, isConnected, roomCreated, playerId]);

  const handleStartGame = () => {
    if (!socket || !room) return;
    socket.emit('room:start', { playerId, roomId: room.id });
  };

  const companionUrl = room ? getCompanionUrl(room.id) : '';
  const canStart = room && room.players.length >= 2;

  return (
    <div style={styles.container}>
      <div style={styles.panel}>
        <h1 style={styles.title}>Phone Companion Setup</h1>
        <p style={styles.subtitle}>
          Each player scans the QR code with their phone to join
        </p>

        {error && (
          <div style={styles.errorBanner}>{error}</div>
        )}

        {room && (
          <>
            {/* QR Code */}
            <div style={styles.qrSection}>
              <div style={styles.qrWrapper}>
                <QRCodeSVG
                  value={companionUrl}
                  size={200}
                  bgColor="transparent"
                  fgColor="#e0e0e0"
                  level="M"
                />
              </div>
              <div style={styles.urlDisplay}>
                <span style={styles.urlLabel}>Or visit:</span>
                <code style={styles.urlCode}>{companionUrl}</code>
              </div>
            </div>

            {/* Player list */}
            <div style={styles.section}>
              <label style={styles.label}>
                Players ({room.players.length}/6)
              </label>
              {room.players.length === 0 ? (
                <div style={styles.waitingText}>
                  Waiting for players to join...
                </div>
              ) : (
                <div style={styles.playerList}>
                  {room.players.map((player, i) => (
                    <div key={player.id} style={styles.playerRow}>
                      <div
                        style={{
                          ...styles.playerDot,
                          background: PLAYER_COLORS[i % PLAYER_COLORS.length],
                        }}
                      />
                      <span style={styles.playerName}>{player.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Start button */}
            <button
              style={{
                ...styles.startButton,
                ...(canStart ? {} : styles.disabledButton),
              }}
              onClick={handleStartGame}
              disabled={!canStart}
            >
              {canStart
                ? `Start Game (${room.players.length} players)`
                : 'Need at least 2 players'}
            </button>
          </>
        )}

        {!room && (
          <div style={styles.waitingText}>Creating room...</div>
        )}

        <button style={styles.backButton} onClick={() => navigate('/local/setup')}>
          Back
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    padding: '20px',
  },
  panel: {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '560px',
    width: '100%',
    textAlign: 'center',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#e0e0e0',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#888',
    margin: '0 0 32px 0',
  },
  errorBanner: {
    padding: '12px 16px',
    borderRadius: '8px',
    background: 'rgba(231, 76, 60, 0.15)',
    border: '1px solid rgba(231, 76, 60, 0.3)',
    color: '#e74c3c',
    fontSize: '0.9rem',
    marginBottom: '16px',
  },
  qrSection: {
    marginBottom: '32px',
  },
  qrWrapper: {
    display: 'inline-block',
    padding: '20px',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    marginBottom: '16px',
  },
  urlDisplay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  urlLabel: {
    fontSize: '0.8rem',
    color: '#888',
  },
  urlCode: {
    fontSize: '0.85rem',
    color: '#3498db',
    background: 'rgba(52, 152, 219, 0.1)',
    padding: '6px 12px',
    borderRadius: '6px',
    wordBreak: 'break-all',
  },
  section: {
    marginBottom: '24px',
    textAlign: 'left',
  },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#aaa',
    marginBottom: '10px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  waitingText: {
    padding: '20px',
    color: '#666',
    fontSize: '0.95rem',
    fontStyle: 'italic',
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  playerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  playerDot: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  playerName: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#e0e0e0',
  },
  startButton: {
    width: '100%',
    padding: '16px 24px',
    fontSize: '1.1rem',
    fontWeight: 700,
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
    marginBottom: '12px',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  backButton: {
    width: '100%',
    padding: '10px',
    fontSize: '0.9rem',
    fontWeight: 500,
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    color: '#888',
    cursor: 'pointer',
  },
};
