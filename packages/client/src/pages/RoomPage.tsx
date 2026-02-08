import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { GameState } from '@cashflow/shared';
import { useConnectionStore } from '../stores/connectionStore';
import { useGameStore } from '../stores/gameStore';
import { useSocket } from '../socket/SocketProvider';
import { OnlineGameAdapter } from '../adapters/OnlineGameAdapter';
import type { Room } from '../types/room.js';
import { PLAYER_COLORS } from '../constants/colors.js';

interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const socket = useSocket();
  const playerId = useConnectionStore((s) => s.playerId);
  const playerName = useConnectionStore((s) => s.playerName);
  const setCurrentRoomId = useConnectionStore((s) => s.setCurrentRoomId);
  const setAdapter = useGameStore((s) => s.setAdapter);

  const [room, setRoom] = useState<Room | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket || !roomId) return;

    setCurrentRoomId(roomId);

    const handleRoomJoined = (data: { room: Room }) => {
      setRoom(data.room);
    };

    const handlePlayerJoined = (data: { room: Room }) => {
      setRoom(data.room);
    };

    const handlePlayerLeft = (data: { room: Room }) => {
      setRoom(data.room);
    };

    const handlePlayerReady = (data: { room: Room }) => {
      setRoom(data.room);
    };

    const handleRoomClosed = () => {
      setCurrentRoomId(null);
      navigate('/lobby');
    };

    const handleGameStarted = (data: { state: GameState; roomId: string }) => {
      // Create OnlineGameAdapter and set it up
      const adapter = new OnlineGameAdapter(socket);
      adapter.setInitialState(data.state);
      setAdapter(adapter);
      navigate(`/game/${data.roomId}`);
    };

    const handleChatMessage = (data: ChatMessage) => {
      setChatMessages((prev) => [...prev, data]);
    };

    const handleError = (data: { message: string }) => {
      alert(data.message);
    };

    socket.on('room:joined', handleRoomJoined);
    socket.on('room:player_joined', handlePlayerJoined);
    socket.on('room:player_left', handlePlayerLeft);
    socket.on('room:player_ready', handlePlayerReady);
    socket.on('room:closed', handleRoomClosed);
    socket.on('game:started', handleGameStarted);
    socket.on('chat:message', handleChatMessage);
    socket.on('error', handleError);

    // If we navigated here directly (e.g., refresh), try to join
    // The room:joined event will populate the room data
    if (!room) {
      socket.emit('room:join', { playerId, playerName, roomId });
    }

    return () => {
      socket.off('room:joined', handleRoomJoined);
      socket.off('room:player_joined', handlePlayerJoined);
      socket.off('room:player_left', handlePlayerLeft);
      socket.off('room:player_ready', handlePlayerReady);
      socket.off('room:closed', handleRoomClosed);
      socket.off('game:started', handleGameStarted);
      socket.off('chat:message', handleChatMessage);
      socket.off('error', handleError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleToggleReady = () => {
    if (!socket) return;
    const newReady = !isReady;
    setIsReady(newReady);
    socket.emit('room:ready', { playerId, ready: newReady });
  };

  const handleStartGame = () => {
    if (!socket || !roomId) return;
    socket.emit('room:start', { playerId, roomId });
  };

  const handleLeaveRoom = () => {
    if (!socket) return;
    socket.emit('room:leave', { playerId });
    setCurrentRoomId(null);
    navigate('/lobby');
  };

  const handleSendChat = () => {
    if (!socket || !chatInput.trim()) return;
    socket.emit('chat:message', { playerId, message: chatInput.trim() });
    setChatInput('');
  };

  if (!room) {
    return (
      <div style={styles.container}>
        <div style={styles.panel}>
          <h1 style={styles.title}>Joining room...</h1>
        </div>
      </div>
    );
  }

  const isHost = room.hostId === playerId;
  const allReady = room.players.length >= 2 && room.players.every((p) => p.id === room.hostId || p.isReady);

  return (
    <div style={styles.container}>
      <div style={styles.panel}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>{room.name}</h1>
            <p style={styles.roomMeta}>
              {room.players.length}/{room.maxPlayers} players
              {isHost && <span style={styles.hostBadge}>You are the host</span>}
            </p>
          </div>
        </div>

        {/* Player list */}
        <div style={styles.section}>
          <label style={styles.label}>Players</label>
          <div style={styles.playerList}>
            {room.players.map((player) => {
              const isCurrentPlayer = player.id === playerId;
              const isPlayerHost = player.id === room.hostId;
              return (
                <div
                  key={player.id}
                  style={{
                    ...styles.playerRow,
                    ...(isCurrentPlayer ? styles.currentPlayerRow : {}),
                  }}
                >
                  <div style={styles.playerInfo}>
                    <div
                      style={{
                        ...styles.playerDot,
                        background: PLAYER_COLORS[room.players.indexOf(player) % PLAYER_COLORS.length],
                      }}
                    />
                    <span style={styles.playerName}>
                      {player.name}
                      {isCurrentPlayer && ' (You)'}
                    </span>
                    {isPlayerHost && (
                      <span style={styles.hostTag}>Host</span>
                    )}
                  </div>
                  <div
                    style={{
                      ...styles.readyBadge,
                      ...(isPlayerHost
                        ? styles.readyBadgeHost
                        : player.isReady
                          ? styles.readyBadgeReady
                          : styles.readyBadgeNotReady),
                    }}
                  >
                    {isPlayerHost ? 'Host' : player.isReady ? 'Ready' : 'Not Ready'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat section */}
        <div style={styles.section}>
          <label style={styles.label}>Chat</label>
          <div style={styles.chatBox}>
            {chatMessages.length === 0 && (
              <p style={styles.chatEmpty}>No messages yet...</p>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} style={styles.chatMessage}>
                <span style={styles.chatSender}>{msg.playerName}:</span>{' '}
                <span style={styles.chatText}>{msg.message}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div style={styles.chatInputRow}>
            <input
              style={styles.chatInput}
              placeholder="Type a message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
            />
            <button
              style={styles.sendButton}
              onClick={handleSendChat}
              disabled={!chatInput.trim()}
            >
              Send
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div style={styles.actionRow}>
          {!isHost && (
            <button
              style={isReady ? styles.notReadyButton : styles.readyButton}
              onClick={handleToggleReady}
            >
              {isReady ? 'Not Ready' : 'Ready'}
            </button>
          )}
          {isHost && (
            <button
              style={{
                ...styles.startButton,
                ...(allReady ? {} : styles.disabledButton),
              }}
              onClick={handleStartGame}
              disabled={!allReady}
            >
              Start Game
            </button>
          )}
          <button style={styles.leaveButton} onClick={handleLeaveRoom}>
            Leave Room
          </button>
        </div>
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
    marginBottom: '24px',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#e0e0e0',
    margin: '0 0 4px 0',
  },
  roomMeta: {
    fontSize: '0.9rem',
    color: '#888',
    margin: 0,
  },
  hostBadge: {
    marginLeft: '8px',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 600,
    background: 'rgba(76, 175, 80, 0.2)',
    color: '#4CAF50',
  },
  section: {
    marginBottom: '24px',
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
  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  playerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  currentPlayerRow: {
    background: 'rgba(76, 175, 80, 0.05)',
    border: '1px solid rgba(76, 175, 80, 0.15)',
  },
  playerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  playerDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  playerName: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#e0e0e0',
  },
  hostTag: {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: 600,
    background: 'rgba(230, 126, 34, 0.2)',
    color: '#e67e22',
  },
  readyBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  readyBadgeReady: {
    background: 'rgba(46, 204, 113, 0.15)',
    color: '#2ecc71',
  },
  readyBadgeNotReady: {
    background: 'rgba(255,255,255,0.05)',
    color: '#888',
  },
  readyBadgeHost: {
    background: 'rgba(230, 126, 34, 0.15)',
    color: '#e67e22',
  },
  chatBox: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '8px',
    padding: '12px',
    height: '150px',
    overflowY: 'auto',
    marginBottom: '8px',
  },
  chatEmpty: {
    color: '#666',
    fontSize: '0.85rem',
    textAlign: 'center',
    margin: 0,
  },
  chatMessage: {
    fontSize: '0.85rem',
    marginBottom: '4px',
    lineHeight: 1.4,
  },
  chatSender: {
    fontWeight: 600,
    color: '#4CAF50',
  },
  chatText: {
    color: '#ccc',
  },
  chatInputRow: {
    display: 'flex',
    gap: '8px',
  },
  chatInput: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '0.9rem',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.08)',
    color: '#e0e0e0',
    outline: 'none',
  },
  sendButton: {
    padding: '8px 16px',
    fontSize: '0.85rem',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(52, 152, 219, 0.3)',
    color: '#3498db',
    cursor: 'pointer',
  },
  actionRow: {
    display: 'flex',
    gap: '12px',
  },
  readyButton: {
    flex: 1,
    padding: '14px 20px',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(76, 175, 80, 0.3)',
  },
  notReadyButton: {
    flex: 1,
    padding: '14px 20px',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '10px',
    border: '1px solid rgba(230, 126, 34, 0.5)',
    background: 'rgba(230, 126, 34, 0.1)',
    color: '#e67e22',
    cursor: 'pointer',
  },
  startButton: {
    flex: 1,
    padding: '14px 20px',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(76, 175, 80, 0.3)',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  leaveButton: {
    padding: '14px 20px',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '10px',
    border: '1px solid rgba(231, 76, 60, 0.3)',
    background: 'rgba(231, 76, 60, 0.1)',
    color: '#e74c3c',
    cursor: 'pointer',
  },
};
