import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROFESSIONS } from '@cashflow/shared';
import type { ProfessionCard } from '@cashflow/shared';
import { LocalGameAdapter } from '../adapters/LocalGameAdapter';
import { useGameStore } from '../stores/gameStore';
import { PLAYER_COLORS } from '../constants/colors.js';

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function LocalSetupPage() {
  const navigate = useNavigate();
  const setAdapter = useGameStore((s) => s.setAdapter);
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState<string[]>([
    'Player 1',
    'Player 2',
    'Player 3',
    'Player 4',
    'Player 5',
    'Player 6',
  ]);
  const [assignedProfessions, setAssignedProfessions] = useState<ProfessionCard[]>([]);
  const [hasRandomized, setHasRandomized] = useState(false);
  const [companionMode, setCompanionMode] = useState(false);

  const handleNameChange = (index: number, name: string) => {
    const updated = [...playerNames];
    updated[index] = name;
    setPlayerNames(updated);
  };

  const randomizeProfessions = () => {
    const shuffled = shuffleArray(PROFESSIONS);
    setAssignedProfessions(shuffled.slice(0, playerCount));
    setHasRandomized(true);
  };

  const startGame = () => {
    if (companionMode) {
      // Companion mode: redirect to host setup page
      navigate('/companion/host/setup', {
        state: { playerCount, playerNames: playerNames.slice(0, playerCount) },
      });
      return;
    }

    let professions = assignedProfessions;
    if (!hasRandomized || professions.length < playerCount) {
      const shuffled = shuffleArray(PROFESSIONS);
      professions = shuffled.slice(0, playerCount);
    }

    const players = Array.from({ length: playerCount }, (_, i) => ({
      id: `player-${i + 1}`,
      name: playerNames[i] || `Player ${i + 1}`,
    }));

    const adapter = new LocalGameAdapter(players, professions);
    setAdapter(adapter);
    navigate('/local/game');
  };

  return (
    <div style={styles.container}>
      <div style={styles.panel}>
        <h1 style={styles.title}>Game Setup</h1>

        <div style={styles.section}>
          <label style={styles.label}>Number of Players</label>
          <div style={styles.playerCountRow}>
            {[2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                style={{
                  ...styles.countButton,
                  ...(playerCount === n ? styles.countButtonActive : {}),
                }}
                onClick={() => {
                  setPlayerCount(n);
                  setHasRandomized(false);
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <label style={styles.label}>Player Names</label>
          <div style={styles.namesList}>
            {Array.from({ length: playerCount }, (_, i) => (
              <div key={i} style={styles.nameRow}>
                <div style={{ ...styles.playerDot, background: PLAYER_COLORS[i] }} />
                <input
                  style={styles.nameInput}
                  value={playerNames[i]}
                  onChange={(e) => handleNameChange(i, e.target.value)}
                  placeholder={`Player ${i + 1}`}
                />
                {hasRandomized && assignedProfessions[i] && (
                  <span style={styles.professionBadge}>
                    {assignedProfessions[i].title}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <label style={styles.label}>Game Mode</label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '10px',
              background: companionMode ? 'rgba(52, 152, 219, 0.15)' : 'rgba(255,255,255,0.03)',
              border: companionMode ? '1px solid rgba(52, 152, 219, 0.4)' : '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onClick={() => setCompanionMode(!companionMode)}
          >
            <div
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                background: companionMode ? '#3498db' : 'rgba(255,255,255,0.15)',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: '2px',
                  left: companionMode ? '22px' : '2px',
                  transition: 'left 0.2s',
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e0e0e0' }}>
                Phone Companion Mode
              </div>
              <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '2px' }}>
                Board on TV/laptop, controls on each player's phone
              </div>
            </div>
          </div>
        </div>

        <div style={styles.buttonRow}>
          <button style={styles.secondaryButton} onClick={randomizeProfessions}>
            Randomize Professions
          </button>
          <button style={styles.startButton} onClick={startGame}>
            {companionMode ? 'Setup Companion' : 'Start Game'}
          </button>
        </div>

        <button style={styles.backButton} onClick={() => navigate('/')}>
          Back
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
    maxWidth: '560px',
    width: '100%',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#e0e0e0',
    marginBottom: '32px',
    textAlign: 'center',
  },
  section: {
    marginBottom: '28px',
  },
  label: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#aaa',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  playerCountRow: {
    display: 'flex',
    gap: '10px',
  },
  countButton: {
    flex: 1,
    padding: '12px',
    fontSize: '1.1rem',
    fontWeight: 600,
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: '#ccc',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  countButtonActive: {
    background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
    color: '#fff',
    border: '1px solid #4CAF50',
    boxShadow: '0 2px 10px rgba(76, 175, 80, 0.3)',
  },
  namesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  playerDot: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  nameInput: {
    flex: 1,
    padding: '10px 14px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.08)',
    color: '#e0e0e0',
    outline: 'none',
  },
  professionBadge: {
    padding: '4px 10px',
    fontSize: '0.8rem',
    fontWeight: 600,
    borderRadius: '6px',
    background: 'rgba(76, 175, 80, 0.2)',
    color: '#4CAF50',
    whiteSpace: 'nowrap',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  secondaryButton: {
    flex: 1,
    padding: '14px 20px',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.08)',
    color: '#e0e0e0',
    cursor: 'pointer',
    transition: 'all 0.15s',
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
    boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
    transition: 'all 0.15s',
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
