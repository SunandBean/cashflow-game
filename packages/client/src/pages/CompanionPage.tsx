import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { GameState } from '@cashflow/shared';
import { getValidActions, TurnPhase } from '@cashflow/shared';
import { useSocket } from '../socket/SocketProvider.js';
import { useConnectionStore } from '../stores/connectionStore.js';
import { formatPhase } from '../utils/formatters.js';
import { FinancialStatement } from '../components/financial/FinancialStatement.js';
import { DiceRoller } from '../components/board/DiceRoller.js';
import { CardModal } from '../components/cards/CardModal.js';
import { DealOfferModal } from '../components/cards/DealOfferModal.js';
import type { Room } from '../types/room.js';
import { PLAYER_COLORS } from '../constants/colors.js';

type Phase = 'join' | 'waiting' | 'playing';

export default function CompanionPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const socket = useSocket();
  const playerId = useConnectionStore((s) => s.playerId);
  const setCurrentRoomId = useConnectionStore((s) => s.setCurrentRoomId);
  const setRole = useConnectionStore((s) => s.setRole);

  const storedName = useConnectionStore((s) => s.playerName);
  const setStoredName = useConnectionStore((s) => s.setPlayerName);
  const isConnected = useConnectionStore((s) => s.isConnected);

  // Only auto-rejoin if the stored roomId matches the current URL
  const storedRoomId = localStorage.getItem('cashflow_companion_room') || '';
  const canAutoRejoin = !!storedName && storedRoomId === roomId;

  const [phase, setPhase] = useState<Phase>('join');
  const [playerName, setPlayerName] = useState(storedName || '');
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loanAmount, setLoanAmount] = useState(1000);
  const [autoRejoinAttempted, setAutoRejoinAttempted] = useState(false);

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleRoomJoined = (data: { room: Room }) => {
      setRoom(data.room);
      setCurrentRoomId(data.room.id);
      setRole('player');
      setPhase('waiting');
      // Store which room we joined
      localStorage.setItem('cashflow_companion_room', data.room.id);
    };

    const handlePlayerJoined = (data: { room: Room }) => {
      setRoom(data.room);
    };

    const handlePlayerLeft = (data: { room: Room }) => {
      setRoom(data.room);
    };

    const handleGameStarted = (data: { state: GameState }) => {
      setGameState(data.state);
      setPhase('playing');
    };

    const handleStateUpdate = (data: { state: GameState }) => {
      setGameState(data.state);
    };

    const handleError = (data: { message: string }) => {
      setError(data.message);
      // If auto-rejoin failed (room gone), clear stored data and show join screen
      localStorage.removeItem('cashflow_companion_room');
      setAutoRejoinAttempted(true);
    };

    socket.on('room:joined', handleRoomJoined);
    socket.on('room:player_joined', handlePlayerJoined);
    socket.on('room:player_left', handlePlayerLeft);
    socket.on('game:started', handleGameStarted);
    socket.on('game:state_update', handleStateUpdate);
    socket.on('error', handleError);

    return () => {
      socket.off('room:joined', handleRoomJoined);
      socket.off('room:player_joined', handlePlayerJoined);
      socket.off('room:player_left', handlePlayerLeft);
      socket.off('game:started', handleGameStarted);
      socket.off('game:state_update', handleStateUpdate);
      socket.off('error', handleError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomId]);

  // Auto-rejoin only if same room and not yet attempted
  useEffect(() => {
    if (!socket || !roomId || !isConnected || phase !== 'join') return;
    if (!canAutoRejoin || autoRejoinAttempted) return;
    setAutoRejoinAttempted(true);
    socket.emit('room:join', { playerId, playerName: storedName, roomId });
  }, [socket, roomId, isConnected, phase, canAutoRejoin, autoRejoinAttempted, storedName, playerId]);

  const handleJoin = () => {
    if (!socket || !roomId || !playerName.trim()) return;
    setError(null);
    setStoredName(playerName.trim());
    socket.emit('room:join', { playerId, playerName: playerName.trim(), roomId });
  };

  const dispatch = useCallback(
    (action: import('@cashflow/shared').GameAction) => {
      if (!socket) return;
      socket.emit('game:action', { playerId, action });
    },
    [socket, playerId],
  );

  // ── Join Phase ──
  if (phase === 'join') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Join Game</h1>
          {error && <div style={styles.errorBanner}>{error}</div>}
          <input
            style={styles.nameInput}
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            autoFocus
          />
          <button
            style={{
              ...styles.primaryButton,
              ...(playerName.trim() ? {} : styles.disabledButton),
            }}
            onClick={handleJoin}
            disabled={!playerName.trim()}
          >
            Join
          </button>
        </div>
      </div>
    );
  }

  // ── Waiting Phase ──
  if (phase === 'waiting') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Waiting for game to start...</h1>
          {room && (
            <div style={styles.playerList}>
              {room.players.map((p, i) => (
                <div key={p.id} style={styles.playerRow}>
                  <div
                    style={{
                      ...styles.playerDot,
                      background: PLAYER_COLORS[i % PLAYER_COLORS.length],
                    }}
                  />
                  <span style={styles.playerNameText}>
                    {p.name}
                    {p.id === playerId && ' (You)'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Playing Phase ──
  if (!gameState) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Loading...</h1>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const myPlayer = gameState.players.find((p) => p.id === playerId);
  const isMyTurn = currentPlayer?.id === playerId;
  const validActions = isMyTurn ? getValidActions(gameState) : [];
  const currentPlayerColor =
    PLAYER_COLORS[gameState.currentPlayerIndex % PLAYER_COLORS.length];

  const handleRoll = (values: [number, number], useBothDice?: boolean) => {
    // In online mode, send dummy dice values; server generates real ones
    dispatch({ type: 'ROLL_DICE', playerId, diceValues: [0, 0], useBothDice });
    void values; // suppress unused warning
  };

  const handleChooseDeal = (dealType: 'small' | 'big') => {
    dispatch({ type: 'CHOOSE_DEAL_TYPE', playerId, dealType });
  };

  const handleSkipDeal = () => {
    dispatch({ type: 'SKIP_DEAL', playerId });
  };

  const handleAcceptCharity = () => {
    dispatch({ type: 'ACCEPT_CHARITY', playerId });
  };

  const handleDeclineCharity = () => {
    dispatch({ type: 'DECLINE_CHARITY', playerId });
  };

  const handleCollectPayDay = () => {
    dispatch({ type: 'COLLECT_PAY_DAY', playerId });
  };

  const handleEndTurn = () => {
    dispatch({ type: 'END_TURN', playerId });
  };

  const handleTakeLoan = () => {
    if (loanAmount > 0 && loanAmount % 1000 === 0) {
      dispatch({ type: 'TAKE_LOAN', playerId, amount: loanAmount });
    }
  };

  const handlePayOffLoan = (loanType: string, balance: number) => {
    if (!myPlayer) return;
    const payAmount = Math.min(balance, Math.floor(myPlayer.cash / 1000) * 1000);
    if (payAmount > 0) {
      dispatch({ type: 'PAY_OFF_LOAN', playerId, loanType, amount: payAmount });
    }
  };

  return (
    <div style={styles.container}>
      {/* Turn banner */}
      <div
        style={{
          ...styles.turnBanner,
          background: isMyTurn
            ? 'linear-gradient(135deg, #4CAF50, #2E7D32)'
            : `linear-gradient(135deg, ${currentPlayerColor}88, ${currentPlayerColor}44)`,
        }}
      >
        <span style={styles.turnBannerText}>
          {isMyTurn ? 'Your Turn!' : `${currentPlayer.name}'s Turn`}
        </span>
        <span style={styles.turnPhaseText}>{formatPhase(gameState.turnPhase)}</span>
      </div>

      {/* Action area (only when it's my turn) */}
      {isMyTurn && (
        <div style={styles.actionSection}>
          {validActions.includes('ROLL_DICE') && (
            <DiceRoller onRoll={handleRoll} charityActive={currentPlayer.charityTurnsLeft > 0} />
          )}

          {validActions.includes('COLLECT_PAY_DAY') && (
            <button style={styles.primaryButton} onClick={handleCollectPayDay}>
              Collect Pay Day
            </button>
          )}

          {validActions.includes('CHOOSE_DEAL_TYPE') && (
            <div style={styles.buttonGroup}>
              <button style={styles.primaryButton} onClick={() => handleChooseDeal('small')}>
                Small Deal
              </button>
              <button style={styles.secondaryButton} onClick={() => handleChooseDeal('big')}>
                Big Deal
              </button>
              <button style={styles.ghostButton} onClick={handleSkipDeal}>
                Skip Deal
              </button>
            </div>
          )}

          {validActions.includes('ACCEPT_CHARITY') && (
            <div style={styles.buttonGroup}>
              <button style={styles.primaryButton} onClick={handleAcceptCharity}>
                Accept Charity (10% of income)
              </button>
              <button style={styles.ghostButton} onClick={handleDeclineCharity}>
                Decline Charity
              </button>
            </div>
          )}

          {gameState.turnPhase === TurnPhase.END_OF_TURN && (
            <div style={styles.endTurnSection}>
              <div style={styles.loanSection}>
                <div style={styles.loanRow}>
                  <span style={styles.loanLabel}>Bank Loan:</span>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={loanAmount}
                    onChange={(e) =>
                      setLoanAmount(Math.max(1000, parseInt(e.target.value) || 1000))
                    }
                    style={styles.loanInput}
                  />
                  <button style={styles.smallButton} onClick={handleTakeLoan}>
                    Take Loan
                  </button>
                </div>

                {myPlayer && myPlayer.bankLoanAmount > 0 && (
                  <div style={styles.loanRow}>
                    <span style={styles.loanLabel}>
                      Bank Loan: ${myPlayer.bankLoanAmount.toLocaleString()}
                    </span>
                    <button
                      style={styles.smallDangerButton}
                      onClick={() => handlePayOffLoan('Bank Loan', myPlayer.bankLoanAmount)}
                    >
                      Pay Off
                    </button>
                  </div>
                )}

                {myPlayer?.financialStatement.liabilities.map((liability) => (
                  <div key={liability.name} style={styles.loanRow}>
                    <span style={styles.loanLabel}>
                      {liability.name}: ${liability.balance.toLocaleString()}
                    </span>
                    <button
                      style={styles.smallDangerButton}
                      onClick={() => handlePayOffLoan(liability.name, liability.balance)}
                    >
                      Pay Off
                    </button>
                  </div>
                ))}
              </div>

              <button style={styles.endTurnButton} onClick={handleEndTurn}>
                End Turn
              </button>
            </div>
          )}
        </div>
      )}

      {/* Card modal */}
      {gameState.activeCard && isMyTurn && (
        <CardModal gameState={gameState} onDispatch={dispatch} localPlayerId={playerId} />
      )}

      {/* Deal offer modal (when another player offers us a deal) */}
      {gameState.pendingPlayerDeal && gameState.pendingPlayerDeal.buyerId === playerId && (
        <DealOfferModal
          gameState={gameState}
          localPlayerId={playerId}
          onDispatch={dispatch}
        />
      )}

      {/* Financial statement (always visible) */}
      {myPlayer && (
        <div style={styles.financialSection}>
          <FinancialStatement player={myPlayer} />
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: '#1a1a2e',
    color: '#e0e0e0',
  },
  card: {
    margin: '20px',
    padding: '32px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
    textAlign: 'center',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#e0e0e0',
    margin: '0 0 20px 0',
  },
  errorBanner: {
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'rgba(231, 76, 60, 0.15)',
    border: '1px solid rgba(231, 76, 60, 0.3)',
    color: '#e74c3c',
    fontSize: '0.85rem',
    marginBottom: '12px',
  },
  nameInput: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '1.1rem',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.08)',
    color: '#e0e0e0',
    outline: 'none',
    marginBottom: '16px',
    boxSizing: 'border-box',
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    textAlign: 'left',
  },
  playerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.03)',
  },
  playerDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  playerNameText: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#e0e0e0',
  },
  turnBanner: {
    padding: '16px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  turnBannerText: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: '#fff',
  },
  turnPhaseText: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  actionSection: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  primaryButton: {
    padding: '14px 20px',
    fontSize: '1.05rem',
    fontWeight: 600,
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
    color: '#fff',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '14px 20px',
    fontSize: '1.05rem',
    fontWeight: 600,
    borderRadius: '12px',
    border: '1px solid rgba(52, 152, 219, 0.5)',
    background: 'rgba(52, 152, 219, 0.1)',
    color: '#3498db',
    cursor: 'pointer',
  },
  ghostButton: {
    padding: '12px 16px',
    fontSize: '0.95rem',
    fontWeight: 500,
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent',
    color: '#999',
    cursor: 'pointer',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  endTurnSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  loanSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
  },
  loanRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  loanLabel: {
    fontSize: '0.85rem',
    color: '#aaa',
    flex: 1,
  },
  loanInput: {
    width: '90px',
    padding: '8px 10px',
    fontSize: '0.9rem',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.08)',
    color: '#e0e0e0',
    textAlign: 'center',
  },
  smallButton: {
    padding: '8px 14px',
    fontSize: '0.85rem',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(52, 152, 219, 0.3)',
    color: '#3498db',
    cursor: 'pointer',
  },
  smallDangerButton: {
    padding: '8px 14px',
    fontSize: '0.85rem',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(231, 76, 60, 0.2)',
    color: '#e74c3c',
    cursor: 'pointer',
  },
  endTurnButton: {
    padding: '16px 20px',
    fontSize: '1.15rem',
    fontWeight: 700,
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #e67e22, #d35400)',
    color: '#fff',
    cursor: 'pointer',
  },
  financialSection: {
    padding: '16px',
    flex: 1,
    overflowY: 'auto',
  },
};
