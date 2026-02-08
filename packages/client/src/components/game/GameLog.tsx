import { useEffect, useRef } from 'react';
import type { GameLogEntry, Player } from '@cashflow/shared';

interface GameLogProps {
  log: GameLogEntry[];
  players: Player[];
}

const MAX_DISPLAY_ENTRIES = 50;

export function GameLog({ log, players }: GameLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log.length]);

  const displayedLog = log.slice(-MAX_DISPLAY_ENTRIES);
  const playerMap = new Map(players.map((p) => [p.id, p.name]));

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>Game Log</h4>
      <div ref={scrollRef} style={styles.logList}>
        {displayedLog.map((entry, i) => {
          const playerName = entry.playerId === 'system'
            ? 'System'
            : playerMap.get(entry.playerId) || entry.playerId;

          return (
            <div key={i} style={styles.entry}>
              <span
                style={{
                  ...styles.playerTag,
                  color: entry.playerId === 'system' ? '#888' : '#3498db',
                }}
              >
                {playerName}:
              </span>
              <span style={styles.message}>{entry.message}</span>
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
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'hidden',
  },
  title: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    margin: '0 0 8px 0',
  },
  logList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minHeight: 0,
  },
  entry: {
    fontSize: '0.8rem',
    lineHeight: 1.4,
    padding: '3px 0',
  },
  playerTag: {
    fontWeight: 600,
    marginRight: '6px',
  },
  message: {
    color: '#bbb',
  },
};
