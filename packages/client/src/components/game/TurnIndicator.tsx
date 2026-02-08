import type { GameState } from '@cashflow/shared';
import { calculatePassiveIncome } from '@cashflow/shared';

interface TurnIndicatorProps {
  gameState: GameState;
}

const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];

export function TurnIndicator({ gameState }: TurnIndicatorProps) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.turnLabel}>Turn {gameState.turnNumber}</span>
        {gameState.diceResult && (
          <span style={styles.diceResult}>
            Dice: {gameState.diceResult[0]} + {gameState.diceResult[1]}
          </span>
        )}
      </div>

      <div style={styles.playerList}>
        {gameState.players.map((player, idx) => {
          const isCurrent = idx === gameState.currentPlayerIndex;
          const passiveIncome = calculatePassiveIncome(player.financialStatement);
          const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];

          return (
            <div
              key={player.id}
              style={{
                ...styles.playerRow,
                ...(isCurrent ? styles.currentPlayerRow : {}),
                borderLeft: `3px solid ${isCurrent ? color : 'transparent'}`,
              }}
            >
              <div style={styles.playerInfo}>
                <div style={{ ...styles.dot, background: color }} />
                <div>
                  <div style={styles.playerName}>
                    {player.name}
                    {isCurrent && <span style={styles.currentBadge}>Current</span>}
                  </div>
                  <div style={styles.playerProfession}>{player.profession}</div>
                </div>
              </div>
              <div style={styles.playerStats}>
                <span style={styles.cashStat}>
                  ${player.cash.toLocaleString()}
                </span>
                {passiveIncome > 0 && (
                  <span style={styles.passiveStat}>
                    +${passiveIncome.toLocaleString()}/mo
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '12px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  turnLabel: {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#e0e0e0',
  },
  diceResult: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#888',
    padding: '2px 8px',
    borderRadius: '4px',
    background: 'rgba(255,255,255,0.05)',
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  playerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 8px',
    borderRadius: '6px',
    transition: 'all 0.2s',
  },
  currentPlayerRow: {
    background: 'rgba(255,255,255,0.05)',
  },
  playerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  playerName: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#e0e0e0',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  currentBadge: {
    fontSize: '0.65rem',
    fontWeight: 600,
    padding: '1px 6px',
    borderRadius: '4px',
    background: 'rgba(76, 175, 80, 0.2)',
    color: '#4CAF50',
  },
  playerProfession: {
    fontSize: '0.75rem',
    color: '#888',
  },
  playerStats: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '2px',
  },
  cashStat: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#e0e0e0',
  },
  passiveStat: {
    fontSize: '0.7rem',
    fontWeight: 500,
    color: '#2ecc71',
  },
};
