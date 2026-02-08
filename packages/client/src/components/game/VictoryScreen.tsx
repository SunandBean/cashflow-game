import { useNavigate } from 'react-router-dom';
import type { Player } from '@cashflow/shared';
import { calculatePassiveIncome, calculateTotalExpenses } from '@cashflow/shared';
import { useGameStore } from '../../stores/gameStore';

interface VictoryScreenProps {
  winner: Player;
}

export function VictoryScreen({ winner }: VictoryScreenProps) {
  const navigate = useNavigate();
  const cleanup = useGameStore((s) => s.cleanup);
  const passiveIncome = calculatePassiveIncome(winner.financialStatement);
  const totalExpenses = calculateTotalExpenses(winner);

  const handleNewGame = () => {
    cleanup();
    navigate('/');
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.content}>
        <div style={styles.trophy}>&#127942;</div>

        <h1 style={styles.title}>VICTORY!</h1>
        <h2 style={styles.playerName}>{winner.name}</h2>
        <p style={styles.profession}>{winner.profession}</p>

        {winner.dream && (
          <div style={styles.dreamSection}>
            <div style={styles.dreamLabel}>Dream Achieved</div>
            <div style={styles.dreamName}>{winner.dream}</div>
          </div>
        )}

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Final Cash</div>
            <div style={styles.statValue}>
              ${winner.cash.toLocaleString()}
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Fast Track Cash Flow</div>
            <div style={styles.statValue}>
              ${winner.fastTrackCashFlow.toLocaleString()}/mo
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Passive Income (Rat Race)</div>
            <div style={styles.statValue}>
              ${passiveIncome.toLocaleString()}/mo
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Assets Owned</div>
            <div style={styles.statValue}>
              {winner.financialStatement.assets.length}
            </div>
          </div>
        </div>

        <button style={styles.newGameButton} onClick={handleNewGame}>
          New Game
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.97) 0%, rgba(15, 52, 96, 0.97) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 500,
  },
  content: {
    textAlign: 'center',
    padding: '48px',
    maxWidth: '650px',
    width: '90%',
  },
  trophy: {
    fontSize: '6rem',
    marginBottom: '16px',
    textShadow: '0 0 60px rgba(241, 196, 15, 0.4)',
  },
  title: {
    fontSize: '3rem',
    fontWeight: 900,
    color: '#f1c40f',
    margin: '0 0 8px 0',
    letterSpacing: '6px',
    textShadow: '0 2px 20px rgba(241, 196, 15, 0.3)',
  },
  playerName: {
    fontSize: '2.5rem',
    fontWeight: 800,
    color: '#e0e0e0',
    margin: '0 0 4px 0',
  },
  profession: {
    fontSize: '1.1rem',
    color: '#4CAF50',
    fontWeight: 600,
    margin: '0 0 24px 0',
  },
  dreamSection: {
    padding: '16px 24px',
    borderRadius: '12px',
    background: 'rgba(241, 196, 15, 0.08)',
    border: '2px solid rgba(241, 196, 15, 0.3)',
    marginBottom: '32px',
    display: 'inline-block',
  },
  dreamLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#f1c40f',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    marginBottom: '4px',
  },
  dreamName: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#f1c40f',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '36px',
  },
  statCard: {
    padding: '16px',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '6px',
  },
  statValue: {
    fontSize: '1.3rem',
    fontWeight: 700,
    color: '#2ecc71',
  },
  newGameButton: {
    padding: '18px 60px',
    fontSize: '1.3rem',
    fontWeight: 700,
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(76, 175, 80, 0.3)',
    transition: 'transform 0.15s',
  },
};
