import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { useUIStore } from '../stores/uiStore';
import { useConnectionStore } from '../stores/connectionStore';
import { GameBoard } from '../components/board/GameBoard';
import { TurnIndicator } from '../components/game/TurnIndicator';
import { ActionPanel } from '../components/game/ActionPanel';
import { GameLog } from '../components/game/GameLog';
import { DevicePassScreen } from '../components/game/DevicePassScreen';
import { CardModal } from '../components/cards/CardModal';
import { DealOfferModal } from '../components/cards/DealOfferModal';
import { FinancialStatement } from '../components/financial/FinancialStatement';
import { DreamSelector } from '../components/game/DreamSelector';
import { EscapeCelebration } from '../components/game/EscapeCelebration';
import { VictoryScreen } from '../components/game/VictoryScreen';

export default function GamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams<{ roomId: string }>();
  const gameState = useGameStore((s) => s.gameState);
  const showDevicePass = useUIStore((s) => s.showDevicePass);
  const showFinancialStatement = useUIStore((s) => s.showFinancialStatement);
  const playerId = useConnectionStore((s) => s.playerId);
  const isReconnecting = useConnectionStore((s) => s.isReconnecting);
  const [showEscapeCelebration, setShowEscapeCelebration] = useState<string | null>(null);
  const [showDreamSelector, setShowDreamSelector] = useState(false);

  // Determine if we're in online mode based on the route
  const isOnline = !!roomId && !location.pathname.startsWith('/local');
  // Companion host mode: board-only fullscreen view
  const isCompanionHost = location.pathname.startsWith('/companion/host/game');

  useEffect(() => {
    if (!gameState) {
      if (isOnline) {
        // In online mode, if no game state, go back to lobby
        navigate('/lobby');
      } else {
        navigate('/');
      }
    }
  }, [gameState, navigate, isOnline]);

  // Detect when a player escapes the rat race
  useEffect(() => {
    if (!gameState) return;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer && currentPlayer.hasEscaped && !currentPlayer.dream && !currentPlayer.isInFastTrack) {
      // Player just escaped - show celebration if not already shown for this player
      if (showEscapeCelebration !== currentPlayer.id) {
        setShowEscapeCelebration(currentPlayer.id);
      }
    }
  }, [gameState, showEscapeCelebration]);

  const handleChooseDreamFromCelebration = useCallback(() => {
    setShowEscapeCelebration(null);
    setShowDreamSelector(true);
  }, []);

  // Close dream selector when dream is chosen
  useEffect(() => {
    if (!gameState) return;
    const escapedWithDream = gameState.players.find(
      (p) => p.hasEscaped && p.dream && showDreamSelector
    );
    if (escapedWithDream) {
      setShowDreamSelector(false);
    }
  }, [gameState, showDreamSelector]);

  if (!gameState) {
    return null;
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  // In online mode, determine if it's this player's turn
  const isMyTurn = isOnline
    ? currentPlayer.id === playerId
    : true; // local mode: always true (single device)

  // In online mode, find the local player for financial statement
  const localPlayer = isOnline
    ? gameState.players.find((p) => p.id === playerId) || currentPlayer
    : currentPlayer;

  // Find winner
  const winner = gameState.winner
    ? gameState.players.find((p) => p.id === gameState.winner)
    : null;

  // Find the player who just escaped for the celebration screen
  const celebrationPlayer = showEscapeCelebration
    ? gameState.players.find((p) => p.id === showEscapeCelebration)
    : null;

  // Find escaped player without dream for dream selector
  const dreamSelectorPlayer = showDreamSelector
    ? gameState.players.find((p) => p.hasEscaped && !p.dream)
    : null;

  if (isCompanionHost) {
    // Companion host mode: fullscreen board + minimal side info
    return (
      <div style={styles.container}>
        {isReconnecting && (
          <div style={styles.reconnectBanner}>
            Reconnecting to server...
          </div>
        )}

        <div style={styles.hostBoardColumn}>
          <GameBoard gameState={gameState} />
        </div>
        <div style={styles.hostSideColumn}>
          <TurnIndicator gameState={gameState} />
          <GameLog log={gameState.log} players={gameState.players} />
        </div>

        {/* Victory screen */}
        {winner && (
          <VictoryScreen winner={winner} />
        )}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {isOnline && isReconnecting && (
        <div style={styles.reconnectBanner}>
          Reconnecting to server...
        </div>
      )}

      {isOnline && !isMyTurn && (
        <div style={styles.waitingBanner}>
          Waiting for {currentPlayer.name} to play...
        </div>
      )}

      <div style={styles.boardColumn}>
        <GameBoard gameState={gameState} />
      </div>
      <div style={styles.sideColumn}>
        <TurnIndicator gameState={gameState} />
        <ActionPanel
          gameState={gameState}
          isOnline={isOnline}
          isMyTurn={isMyTurn}
          localPlayerId={isOnline ? playerId : undefined}
        />
        {showFinancialStatement && localPlayer && (
          <FinancialStatement player={localPlayer} />
        )}
        <GameLog log={gameState.log} players={gameState.players} />
      </div>

      {gameState.activeCard && isMyTurn && (
        <CardModal gameState={gameState} localPlayerId={isOnline ? playerId : undefined} />
      )}

      {/* Deal offer modal for the buyer who received a deal offer */}
      {gameState.pendingPlayerDeal && (
        isOnline
          ? gameState.pendingPlayerDeal.buyerId === playerId
          : true
      ) && (
        <DealOfferModal
          gameState={gameState}
          localPlayerId={isOnline ? playerId : gameState.pendingPlayerDeal.buyerId}
          onDispatch={useGameStore.getState().dispatch}
        />
      )}

      {/* Only show device pass screen in local mode */}
      {!isOnline && showDevicePass && (
        <DevicePassScreen player={currentPlayer} />
      )}

      {/* Escape celebration overlay */}
      {celebrationPlayer && isMyTurn && (
        <EscapeCelebration
          player={celebrationPlayer}
          onChooseDream={handleChooseDreamFromCelebration}
        />
      )}

      {/* Dream selector overlay */}
      {dreamSelectorPlayer && isMyTurn && (
        <DreamSelector player={dreamSelectorPlayer} />
      )}

      {/* Victory screen */}
      {winner && (
        <VictoryScreen winner={winner} />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    background: '#1a1a2e',
    position: 'relative',
  },
  boardColumn: {
    flex: '0 0 60%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    overflow: 'hidden',
  },
  sideColumn: {
    flex: '0 0 40%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    overflowY: 'auto',
    borderLeft: '1px solid rgba(255,255,255,0.1)',
  },
  hostBoardColumn: {
    flex: '1 1 75%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    overflow: 'hidden',
  },
  hostSideColumn: {
    flex: '0 0 25%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    overflowY: 'auto',
    borderLeft: '1px solid rgba(255,255,255,0.1)',
  },
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
  waitingBanner: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    padding: '8px 16px',
    textAlign: 'center',
    background: 'rgba(52, 152, 219, 0.9)',
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
};
