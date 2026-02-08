import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConnectionStore } from '../stores/connectionStore';
import { useSocket } from '../socket/SocketProvider';

interface RoomPlayer {
  id: string;
  name: string;
  socketId: string;
  isReady: boolean;
}

interface Room {
  id: string;
  name: string;
  hostId: string;
  players: RoomPlayer[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
}

export default function LobbyPage() {
  const navigate = useNavigate();
  const socket = useSocket();
  const playerId = useConnectionStore((s) => s.playerId);
  const playerName = useConnectionStore((s) => s.playerName);
  const setPlayerName = useConnectionStore((s) => s.setPlayerName);
  const setCurrentRoomId = useConnectionStore((s) => s.setCurrentRoomId);
  const isConnected = useConnectionStore((s) => s.isConnected);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [nameInput, setNameInput] = useState(playerName || '');
  const [hasSetName, setHasSetName] = useState(!!playerName);

  const refreshRooms = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('room:list');
    }
  }, [socket, isConnected]);

  useEffect(() => {
    if (!socket) return;

    const handleRoomList = (data: { rooms: Room[] }) => {
      setRooms(data.rooms.filter((r) => r.status === 'waiting'));
    };

    const handleRoomCreated = (data: { room: Room }) => {
      setCurrentRoomId(data.room.id);
      navigate(`/room/${data.room.id}`);
    };

    const handleRoomJoined = (data: { room: Room }) => {
      setCurrentRoomId(data.room.id);
      navigate(`/room/${data.room.id}`);
    };

    const handleError = (data: { message: string }) => {
      alert(data.message);
    };

    socket.on('room:list', handleRoomList);
    socket.on('room:created', handleRoomCreated);
    socket.on('room:joined', handleRoomJoined);
    socket.on('error', handleError);

    refreshRooms();

    return () => {
      socket.off('room:list', handleRoomList);
      socket.off('room:created', handleRoomCreated);
      socket.off('room:joined', handleRoomJoined);
      socket.off('error', handleError);
    };
  }, [socket, navigate, setCurrentRoomId, refreshRooms]);

  // Periodically refresh rooms
  useEffect(() => {
    const interval = setInterval(refreshRooms, 3000);
    return () => clearInterval(interval);
  }, [refreshRooms]);

  const handleSetName = () => {
    if (nameInput.trim()) {
      setPlayerName(nameInput.trim());
      setHasSetName(true);
    }
  };

  const handleCreateRoom = () => {
    if (!socket || !roomName.trim()) return;
    socket.emit('room:create', {
      playerId,
      playerName,
      roomName: roomName.trim(),
      maxPlayers: 6,
    });
  };

  const handleJoinRoom = (roomId: string) => {
    if (!socket) return;
    socket.emit('room:join', {
      playerId,
      playerName,
      roomId,
    });
  };

  // Name entry screen
  if (!hasSetName) {
    return (
      <div style={styles.container}>
        <div style={styles.panel}>
          <h1 style={styles.title}>Enter Your Name</h1>
          <p style={styles.subtitle}>Choose a name for online play</p>
          <div style={styles.nameInputRow}>
            <input
              style={styles.input}
              placeholder="Your name..."
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSetName()}
              autoFocus
            />
            <button
              style={{
                ...styles.primaryButton,
                ...(nameInput.trim() ? {} : styles.disabledButton),
              }}
              onClick={handleSetName}
              disabled={!nameInput.trim()}
            >
              Continue
            </button>
          </div>
          <button style={styles.backButton} onClick={() => navigate('/')}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.panel}>
        <div style={styles.headerRow}>
          <h1 style={styles.title}>Game Lobby</h1>
          <div style={styles.connectionBadge}>
            <div
              style={{
                ...styles.connectionDot,
                background: isConnected ? '#2ecc71' : '#e74c3c',
              }}
            />
            <span style={{ color: '#aaa', fontSize: '0.8rem' }}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <p style={styles.welcomeText}>
          Playing as <strong style={{ color: '#4CAF50' }}>{playerName}</strong>
        </p>

        {/* Action buttons */}
        <div style={styles.actionRow}>
          <button style={styles.primaryButton} onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'Cancel' : 'Create Room'}
          </button>
          <button style={styles.secondaryButton} onClick={refreshRooms}>
            Refresh
          </button>
        </div>

        {/* Create room form */}
        {showCreate && (
          <div style={styles.createForm}>
            <input
              style={styles.input}
              placeholder="Room name..."
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
              autoFocus
            />
            <button
              style={{
                ...styles.primaryButton,
                ...(roomName.trim() ? {} : styles.disabledButton),
              }}
              onClick={handleCreateRoom}
              disabled={!roomName.trim()}
            >
              Create
            </button>
          </div>
        )}

        {/* Room list */}
        <div style={styles.roomList}>
          {rooms.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>No rooms available</p>
              <p style={styles.emptySubtext}>Create one to get started!</p>
            </div>
          ) : (
            rooms.map((room) => {
              const hostPlayer = room.players.find((p) => p.id === room.hostId);
              return (
                <div key={room.id} style={styles.roomCard}>
                  <div style={styles.roomInfo}>
                    <div style={styles.roomName}>{room.name}</div>
                    <div style={styles.roomMeta}>
                      Host: {hostPlayer?.name ?? 'Unknown'} | {room.players.length}/{room.maxPlayers} players
                    </div>
                  </div>
                  <button
                    style={{
                      ...styles.joinButton,
                      ...(room.players.length >= room.maxPlayers ? styles.disabledButton : {}),
                    }}
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={room.players.length >= room.maxPlayers}
                  >
                    {room.players.length >= room.maxPlayers ? 'Full' : 'Join'}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <button style={styles.backButton} onClick={() => navigate('/')}>
          Back to Home
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
    maxWidth: '600px',
    width: '100%',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#e0e0e0',
    margin: 0,
  },
  subtitle: {
    fontSize: '1rem',
    color: '#888',
    marginBottom: '24px',
  },
  connectionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  connectionDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  welcomeText: {
    fontSize: '0.95rem',
    color: '#aaa',
    marginBottom: '24px',
  },
  actionRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  createForm: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    padding: '16px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  nameInputRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '1rem',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.08)',
    color: '#e0e0e0',
    outline: 'none',
  },
  primaryButton: {
    padding: '12px 24px',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.15s',
    boxShadow: '0 2px 10px rgba(76, 175, 80, 0.3)',
  },
  secondaryButton: {
    padding: '12px 24px',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.08)',
    color: '#e0e0e0',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  roomList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '24px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  roomCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    transition: 'background 0.15s',
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#e0e0e0',
    marginBottom: '4px',
  },
  roomMeta: {
    fontSize: '0.8rem',
    color: '#888',
  },
  joinButton: {
    padding: '8px 20px',
    fontSize: '0.9rem',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #3498db, #2980b9)',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.15s',
    flexShrink: 0,
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  emptyText: {
    fontSize: '1.1rem',
    color: '#888',
    marginBottom: '4px',
  },
  emptySubtext: {
    fontSize: '0.9rem',
    color: '#666',
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
