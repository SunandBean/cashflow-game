import type { Player } from '@cashflow/shared';
import { calculatePassiveIncome, calculateTotalExpenses } from '@cashflow/shared';

interface EscapeCelebrationProps {
  player: Player;
  onChooseDream: () => void;
}

export function EscapeCelebration({ player, onChooseDream }: EscapeCelebrationProps) {
  const passiveIncome = calculatePassiveIncome(player.financialStatement);
  const totalExpenses = calculateTotalExpenses(player);

  return (
    <div style={styles.overlay}>
      <div style={styles.content}>
        <div style={styles.starburst}>
          <div style={styles.starIcon}>&#9733;</div>
        </div>

        <h1 style={styles.title}>Congratulations!</h1>
        <h2 style={styles.playerName}>{player.name}</h2>
        <p style={styles.message}>You have escaped the Rat Race!</p>

        <div style={styles.statsContainer}>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Passive Income</div>
            <div style={styles.statValueGreen}>
              ${passiveIncome.toLocaleString()}/mo
            </div>
          </div>
          <div style={styles.vsText}>{'>'}</div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Total Expenses</div>
            <div style={styles.statValueRed}>
              ${totalExpenses.toLocaleString()}/mo
            </div>
          </div>
        </div>

        <p style={styles.explanation}>
          Your passive income exceeds your total expenses. You are financially free!
          Now choose a dream to pursue on the Fast Track.
        </p>

        <button style={styles.dreamButton} onClick={onChooseDream}>
          Choose Your Dream
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(15, 52, 96, 0.95) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 250,
  },
  content: {
    textAlign: 'center',
    padding: '48px',
    maxWidth: '600px',
  },
  starburst: {
    marginBottom: '24px',
  },
  starIcon: {
    fontSize: '5rem',
    color: '#f1c40f',
    textShadow: '0 0 40px rgba(241, 196, 15, 0.5)',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 500,
    color: '#f1c40f',
    margin: '0 0 8px 0',
    letterSpacing: '3px',
    textTransform: 'uppercase',
  },
  playerName: {
    fontSize: '3rem',
    fontWeight: 800,
    color: '#e0e0e0',
    margin: '0 0 8px 0',
  },
  message: {
    fontSize: '1.3rem',
    color: '#2ecc71',
    fontWeight: 600,
    margin: '0 0 32px 0',
  },
  statsContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    marginBottom: '24px',
  },
  statBox: {
    padding: '16px 24px',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  statLabel: {
    fontSize: '0.8rem',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '4px',
  },
  statValueGreen: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#2ecc71',
  },
  statValueRed: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#e74c3c',
  },
  vsText: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#f1c40f',
  },
  explanation: {
    fontSize: '1rem',
    color: '#aaa',
    lineHeight: '1.6',
    marginBottom: '32px',
  },
  dreamButton: {
    padding: '18px 60px',
    fontSize: '1.3rem',
    fontWeight: 700,
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(135deg, #f1c40f, #e67e22)',
    color: '#1a1a2e',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(241, 196, 15, 0.3)',
    transition: 'transform 0.15s',
  },
};
