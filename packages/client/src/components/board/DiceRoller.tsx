import { useState, useCallback } from 'react';

interface DiceRollerProps {
  onRoll: (values: [number, number]) => void;
  disabled?: boolean;
}

function DiceFace({ value, size = 60 }: { value: number; size?: number }) {
  const dotR = size * 0.07;
  const pad = size * 0.25;
  const mid = size / 2;

  // Dot positions for dice faces 1-6
  const dots: Record<number, [number, number][]> = {
    1: [[mid, mid]],
    2: [[pad, pad], [size - pad, size - pad]],
    3: [[pad, pad], [mid, mid], [size - pad, size - pad]],
    4: [[pad, pad], [size - pad, pad], [pad, size - pad], [size - pad, size - pad]],
    5: [[pad, pad], [size - pad, pad], [mid, mid], [pad, size - pad], [size - pad, size - pad]],
    6: [
      [pad, pad], [size - pad, pad],
      [pad, mid], [size - pad, mid],
      [pad, size - pad], [size - pad, size - pad],
    ],
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect
        width={size}
        height={size}
        rx={size * 0.12}
        fill="#f5f5f5"
        stroke="#ccc"
        strokeWidth={1}
      />
      {(dots[value] || dots[1]).map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={dotR} fill="#333" />
      ))}
    </svg>
  );
}

export function DiceRoller({ onRoll, disabled }: DiceRollerProps) {
  const [values, setValues] = useState<[number, number]>([1, 1]);
  const [rolling, setRolling] = useState(false);

  const roll = useCallback(() => {
    if (disabled || rolling) return;
    setRolling(true);

    // Quick animation: flash random values
    let count = 0;
    const interval = setInterval(() => {
      setValues([
        Math.ceil(Math.random() * 6) as number,
        Math.ceil(Math.random() * 6) as number,
      ]);
      count++;
      if (count >= 6) {
        clearInterval(interval);
        const final: [number, number] = [
          Math.ceil(Math.random() * 6),
          Math.ceil(Math.random() * 6),
        ];
        setValues(final);
        setRolling(false);
        onRoll(final);
      }
    }, 50);
  }, [disabled, rolling, onRoll]);

  return (
    <div style={styles.container}>
      <div style={{ ...styles.diceRow, ...(rolling ? styles.shaking : {}) }}>
        <DiceFace value={values[0]} />
        <DiceFace value={values[1]} />
      </div>
      <button
        style={{
          ...styles.rollButton,
          ...(disabled ? styles.rollButtonDisabled : {}),
        }}
        onClick={roll}
        disabled={disabled || rolling}
      >
        {rolling ? 'Rolling...' : 'Roll Dice'}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  diceRow: {
    display: 'flex',
    gap: '12px',
    transition: 'transform 0.05s',
  },
  shaking: {
    animation: 'none',
    transform: 'rotate(2deg)',
  },
  rollButton: {
    padding: '10px 32px',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  rollButtonDisabled: {
    background: '#444',
    color: '#888',
    cursor: 'not-allowed',
  },
};
