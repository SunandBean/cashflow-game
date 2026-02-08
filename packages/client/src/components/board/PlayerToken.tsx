import { PLAYER_COLORS } from '../../constants/colors.js';

interface PlayerTokenProps {
  playerIndex: number;
  x: number;
  y: number;
  isCurrentPlayer: boolean;
  name: string;
}

export function PlayerToken({ playerIndex, x, y, isCurrentPlayer, name }: PlayerTokenProps) {
  const color = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
  const radius = isCurrentPlayer ? 12 : 10;
  const filterId = `tokenShadow-${playerIndex}`;

  return (
    <g style={{ transition: 'transform 0.5s ease-in-out' }}>
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.5)" />
        </filter>
      </defs>
      {isCurrentPlayer && (
        <circle
          cx={x}
          cy={y}
          r={radius + 5}
          fill="none"
          stroke={color}
          strokeWidth={2}
          opacity={0.5}
        >
          <animate
            attributeName="r"
            values={`${radius + 4};${radius + 8};${radius + 4}`}
            dur="1.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.5;0.2;0.5"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
      )}
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={color}
        stroke="#fff"
        strokeWidth={2.5}
        filter={`url(#${filterId})`}
      />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize={isCurrentPlayer ? 9 : 8}
        fontWeight={700}
      >
        {name.charAt(0).toUpperCase()}
      </text>
    </g>
  );
}
