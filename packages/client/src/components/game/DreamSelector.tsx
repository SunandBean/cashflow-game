import { FAST_TRACK_SPACES } from '@cashflow/shared';
import type { Player } from '@cashflow/shared';
import { useGameStore } from '../../stores/gameStore';

interface DreamSelectorProps {
  player: Player;
}

const DREAM_SPACES = FAST_TRACK_SPACES.filter((space) => space.type === 'Dream' && space.dream);

export function DreamSelector({ player }: DreamSelectorProps) {
  const dispatch = useGameStore((s) => s.dispatch);

  const handleSelectDream = (dream: string) => {
    dispatch({ type: 'CHOOSE_DREAM', playerId: player.id, dream });
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Choose Your Dream</h2>
        <p style={styles.subtitle}>
          You've escaped the Rat Race! Now choose a dream to pursue on the Fast Track.
          Land on your dream space to win the game!
        </p>

        <div style={styles.dreamGrid}>
          {DREAM_SPACES.map((space) => (
            <button
              key={space.index}
              style={styles.dreamCard}
              onClick={() => handleSelectDream(space.dream!)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#f1c40f';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(241, 196, 15, 0.3)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              }}
            >
              <div style={styles.dreamIcon}>
                {getDreamIcon(space.dream!)}
              </div>
              <div style={styles.dreamName}>{space.dream}</div>
              <div style={styles.dreamSpace}>Fast Track Space #{space.index}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function getDreamIcon(dream: string): string {
  switch (dream) {
    case 'World Travel': return '🌍';
    case 'Private Jet': return '✈';
    case 'Amazon Rainforest Adventure': return '🌿';
    case 'African Safari': return '🦁';
    case 'Education Foundation': return '🎓';
    default: return '⭐';
  }
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
  },
  modal: {
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    borderRadius: '20px',
    padding: '40px',
    maxWidth: '700px',
    width: '90%',
    border: '2px solid rgba(241, 196, 15, 0.3)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 800,
    color: '#f1c40f',
    textAlign: 'center',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#aaa',
    textAlign: 'center',
    margin: '0 0 32px 0',
    lineHeight: '1.5',
  },
  dreamGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
  },
  dreamCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 16px',
    borderRadius: '14px',
    border: '2px solid rgba(241, 196, 15, 0.3)',
    background: 'rgba(241, 196, 15, 0.05)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    color: '#e0e0e0',
  },
  dreamIcon: {
    fontSize: '2.5rem',
    marginBottom: '12px',
  },
  dreamName: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#f1c40f',
    textAlign: 'center',
    marginBottom: '4px',
  },
  dreamSpace: {
    fontSize: '0.75rem',
    color: '#888',
  },
};
