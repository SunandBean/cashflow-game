import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Cashflow 101</h1>
        <p style={styles.subtitle}>Escape the Rat Race</p>

        <div style={styles.buttonGroup}>
          <button
            style={styles.primaryButton}
            onClick={() => navigate('/local/setup')}
          >
            Local Game
          </button>
          <button
            style={styles.onlineButton}
            onClick={() => navigate('/lobby')}
          >
            Online Game
          </button>
        </div>

        <p style={styles.footer}>
          A financial education board game by Robert Kiyosaki
        </p>
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
  },
  content: {
    textAlign: 'center',
    padding: '60px 40px',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.1)',
    maxWidth: '480px',
    width: '100%',
  },
  title: {
    fontSize: '3.5rem',
    fontWeight: 800,
    color: '#e0e0e0',
    marginBottom: '8px',
    letterSpacing: '-1px',
  },
  subtitle: {
    fontSize: '1.2rem',
    color: '#888',
    marginBottom: '48px',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '48px',
  },
  primaryButton: {
    padding: '18px 40px',
    fontSize: '1.2rem',
    fontWeight: 600,
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
    color: '#fff',
    transition: 'transform 0.15s, box-shadow 0.15s',
    boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
  },
  onlineButton: {
    padding: '18px 40px',
    fontSize: '1.2rem',
    fontWeight: 600,
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    background: 'linear-gradient(135deg, #3498db, #2980b9)',
    color: '#fff',
    transition: 'transform 0.15s, box-shadow 0.15s',
    boxShadow: '0 4px 15px rgba(52, 152, 219, 0.3)',
  },
  footer: {
    fontSize: '0.85rem',
    color: '#555',
  },
};
