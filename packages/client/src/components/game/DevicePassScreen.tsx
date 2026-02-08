import type { Player } from '@cashflow/shared';
import { useUIStore } from '../../stores/uiStore';

interface DevicePassScreenProps {
  player: Player;
}

export function DevicePassScreen({ player }: DevicePassScreenProps) {
  const setShowDevicePass = useUIStore((s) => s.setShowDevicePass);

  return (
    <div style={styles.overlay}>
      <div style={styles.content}>
        <div style={styles.icon}>
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="30" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <path
              d="M20 32 L44 32 M44 32 L36 24 M44 32 L36 40"
              stroke="#4CAF50"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 style={styles.title}>Pass the device to</h1>
        <h2 style={styles.playerName}>{player.name}</h2>
        <p style={styles.profession}>{player.profession}</p>

        <button
          style={styles.readyButton}
          onClick={() => setShowDevicePass(false)}
        >
          I'm Ready
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  content: {
    textAlign: 'center',
    padding: '40px',
  },
  icon: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 500,
    color: '#888',
    margin: '0 0 8px 0',
  },
  playerName: {
    fontSize: '3rem',
    fontWeight: 800,
    color: '#e0e0e0',
    margin: '0 0 8px 0',
  },
  profession: {
    fontSize: '1.2rem',
    color: '#4CAF50',
    marginBottom: '48px',
    fontWeight: 600,
  },
  readyButton: {
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
