import { RAT_RACE_SPACES, FAST_TRACK_SPACES } from '@cashflow/shared';
import type { GameState, RatRaceSpace, FastTrackSpace } from '@cashflow/shared';
import { PlayerToken } from './PlayerToken.js';
import { formatPhase } from '../../utils/formatters.js';
import { PLAYER_COLORS } from '../../constants/colors.js';

interface GameBoardProps {
  gameState: GameState;
}

const BOARD_SIZE = 800;
const SPACE_W = 90;
const SPACE_H = 70;
const MARGIN = 20;

// Color map for rat race space types (base colors for gradients)
const SPACE_COLORS: Record<string, [string, string]> = {
  Deal: ['#3498db', '#1a5276'],
  Market: ['#f39c12', '#b7750d'],
  Doodad: ['#e74c3c', '#922b21'],
  PayDay: ['#2ecc71', '#1a8a4a'],
  Charity: ['#9b59b6', '#6c3483'],
  Baby: ['#fd79a8', '#c44569'],
  Downsized: ['#95a5a6', '#566573'],
};

// Icons for each space type
const SPACE_ICONS: Record<string, string> = {
  Deal: '\uD83D\uDCBC',
  Market: '\uD83D\uDCC8',
  Doodad: '\uD83D\uDED2',
  PayDay: '\uD83D\uDCB5',
  Charity: '\u2764\uFE0F',
  Baby: '\uD83D\uDC76',
  Downsized: '\uD83D\uDCC9',
};

// Color map for fast track space types
const FAST_TRACK_COLORS: Record<string, [string, string]> = {
  CashFlowDay: ['#2ecc71', '#1a8a4a'],
  BusinessDeal: ['#3498db', '#1a5276'],
  Charity: ['#9b59b6', '#6c3483'],
  Tax: ['#f1c40f', '#b7950b'],
  Lawsuit: ['#e74c3c', '#922b21'],
  Divorce: ['#95a5a6', '#566573'],
  Dream: ['#d4a017', '#a37c10'],
};

const FAST_TRACK_ICONS: Record<string, string> = {
  CashFlowDay: '\uD83D\uDCB5',
  BusinessDeal: '\uD83D\uDCBC',
  Charity: '\u2764\uFE0F',
  Tax: '\uD83C\uDFE6',
  Lawsuit: '\u2696\uFE0F',
  Divorce: '\uD83D\uDC94',
  Dream: '\u2B50',
};

// Fast track dimensions
const FT_SPACE_W = 72;
const FT_SPACE_H = 52;

/** Split a label into up to 2 lines at the best word boundary. */
function wrapLabel(label: string, maxCharsPerLine: number): string[] {
  if (label.length <= maxCharsPerLine) return [label];
  // Try to split at a space near the middle
  const mid = Math.ceil(label.length / 2);
  let splitIdx = label.lastIndexOf(' ', mid);
  if (splitIdx <= 0) splitIdx = label.indexOf(' ', mid);
  if (splitIdx <= 0) return [label]; // no space found, keep as single line
  return [label.substring(0, splitIdx), label.substring(splitIdx + 1)];
}

function getSpacePosition(
  index: number,
  _total: number,
): { x: number; y: number; rotation: number } {
  const top = 7;
  const right = 5;
  const bottom = 7;
  const left = 5;

  const startX = MARGIN;
  const startY = MARGIN;
  const innerW = BOARD_SIZE - 2 * MARGIN - SPACE_W;
  const innerH = BOARD_SIZE - 2 * MARGIN - SPACE_H;

  if (index < top) {
    const step = innerW / (top - 1);
    return { x: startX + index * step, y: startY, rotation: 0 };
  } else if (index < top + right) {
    const ri = index - top;
    return { x: startX + innerW, y: startY + (ri + 1) * innerH / (right + 1), rotation: 90 };
  } else if (index < top + right + bottom) {
    const bi = index - top - right;
    const step = innerW / (bottom - 1);
    return { x: startX + innerW - bi * step, y: startY + innerH, rotation: 180 };
  } else {
    const li = index - top - right - bottom;
    return { x: startX, y: startY + innerH - (li + 1) * innerH / (left + 1), rotation: 270 };
  }
}

function getFastTrackPosition(
  index: number,
): { x: number; y: number } {
  const top = 6;
  const right = 3;
  const bottom = 6;
  const left = 3;

  const outerMargin = -FT_SPACE_H - 8;
  const startX = outerMargin;
  const startY = outerMargin;
  const innerW = BOARD_SIZE - 2 * outerMargin - FT_SPACE_W;
  const innerH = BOARD_SIZE - 2 * outerMargin - FT_SPACE_H;

  if (index < top) {
    const step = innerW / (top - 1);
    return { x: startX + index * step, y: startY };
  } else if (index < top + right) {
    const ri = index - top;
    const step = innerH / (right + 1);
    return { x: startX + innerW, y: startY + (ri + 1) * step };
  } else if (index < top + right + bottom) {
    const bi = index - top - right;
    const step = innerW / (bottom - 1);
    return { x: startX + innerW - bi * step, y: startY + innerH };
  } else {
    const li = index - top - right - bottom;
    const step = innerH / (left + 1);
    return { x: startX, y: startY + innerH - (li + 1) * step };
  }
}

function SpaceRect({ space }: { space: RatRaceSpace }) {
  const pos = getSpacePosition(space.index, RAT_RACE_SPACES.length);
  const gradId = `grad-rr-${space.type}`;
  const isPayDay = space.type === 'PayDay';
  const icon = SPACE_ICONS[space.type] || '';

  return (
    <g>
      <rect
        x={pos.x}
        y={pos.y}
        width={SPACE_W}
        height={SPACE_H}
        rx={8}
        ry={8}
        fill={`url(#${gradId})`}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={1.5}
        filter={isPayDay ? 'url(#payDayGlow)' : undefined}
      />
      {/* Highlight stripe for depth */}
      <rect
        x={pos.x + 2}
        y={pos.y + 2}
        width={SPACE_W - 4}
        height={6}
        rx={3}
        fill="rgba(255,255,255,0.15)"
      />
      {/* Icon */}
      <text
        x={pos.x + SPACE_W - 14}
        y={pos.y + 14}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12}
      >
        {icon}
      </text>
      {/* Label */}
      <text
        x={pos.x + SPACE_W / 2}
        y={pos.y + SPACE_H / 2 - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize={11}
        fontWeight={700}
        letterSpacing={0.5}
      >
        {space.label}
      </text>
      {/* Index */}
      <text
        x={pos.x + SPACE_W / 2}
        y={pos.y + SPACE_H / 2 + 12}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="rgba(255,255,255,0.5)"
        fontSize={8}
      >
        #{space.index}
      </text>
    </g>
  );
}

function FastTrackSpaceRect({ space }: { space: FastTrackSpace }) {
  const pos = getFastTrackPosition(space.index);
  const isDream = space.type === 'Dream';
  const gradId = `grad-ft-${space.type}`;
  const icon = FAST_TRACK_ICONS[space.type] || '';

  return (
    <g>
      <rect
        x={pos.x}
        y={pos.y}
        width={FT_SPACE_W}
        height={FT_SPACE_H}
        rx={6}
        ry={6}
        fill={isDream ? 'none' : `url(#${gradId})`}
        stroke={isDream ? '#d4a017' : 'rgba(255,255,255,0.15)'}
        strokeWidth={isDream ? 2 : 1}
        opacity={0.9}
      />
      {isDream && (
        <rect
          x={pos.x}
          y={pos.y}
          width={FT_SPACE_W}
          height={FT_SPACE_H}
          rx={6}
          ry={6}
          fill="url(#dreamGradient)"
          opacity={0.8}
        />
      )}
      {/* Highlight stripe */}
      {!isDream && (
        <rect
          x={pos.x + 2}
          y={pos.y + 2}
          width={FT_SPACE_W - 4}
          height={4}
          rx={2}
          fill="rgba(255,255,255,0.12)"
        />
      )}
      {/* Icon */}
      <text
        x={pos.x + FT_SPACE_W - 10}
        y={pos.y + 11}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={9}
      >
        {icon}
      </text>
      {(() => {
        const lines = wrapLabel(space.label, 10);
        const isMultiLine = lines.length > 1;
        const baseY = pos.y + (isDream ? FT_SPACE_H / 2 - 8 : FT_SPACE_H / 2 - 4);
        const fontSize = isDream ? 7 : (isMultiLine ? 7.5 : 9);
        return (
          <text
            x={pos.x + FT_SPACE_W / 2}
            y={isMultiLine ? baseY - 4 : baseY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            fontSize={fontSize}
            fontWeight={700}
            letterSpacing={0.3}
          >
            {lines.map((line, i) => (
              <tspan
                key={i}
                x={pos.x + FT_SPACE_W / 2}
                dy={i === 0 ? 0 : fontSize + 2}
              >
                {line}
              </tspan>
            ))}
          </text>
        );
      })()}
      {isDream && space.dream && (
        <text
          x={pos.x + FT_SPACE_W / 2}
          y={pos.y + FT_SPACE_H / 2 + 6}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#f1c40f"
          fontSize={7}
          fontWeight={500}
        >
          DREAM
        </text>
      )}
      {!isDream && (
        <text
          x={pos.x + FT_SPACE_W / 2}
          y={pos.y + FT_SPACE_H / 2 + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.4)"
          fontSize={7}
        >
          FT#{space.index}
        </text>
      )}
    </g>
  );
}

export function GameBoard({ gameState }: GameBoardProps) {
  const hasFastTrackPlayers = gameState.players.some((p) => p.isInFastTrack);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const currentPlayerColor = PLAYER_COLORS[gameState.currentPlayerIndex % PLAYER_COLORS.length];
  const lastDice = gameState.diceResult;

  return (
    <svg
      viewBox={`${-FT_SPACE_H - 16} ${-FT_SPACE_H - 16} ${BOARD_SIZE + 2 * (FT_SPACE_H + 16)} ${BOARD_SIZE + 2 * (FT_SPACE_H + 16)}`}
      style={{ width: '100%', height: '100%', maxHeight: '100%' }}
    >
      <defs>
        {/* Rat race space gradients */}
        {Object.entries(SPACE_COLORS).map(([type, [c1, c2]]) => (
          <linearGradient key={`rr-${type}`} id={`grad-rr-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        ))}
        {/* Fast track space gradients */}
        {Object.entries(FAST_TRACK_COLORS).map(([type, [c1, c2]]) => (
          <linearGradient key={`ft-${type}`} id={`grad-ft-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        ))}
        {/* Dream gradient */}
        <linearGradient id="dreamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d4a017" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f1c40f" stopOpacity="0.15" />
        </linearGradient>
        {/* Board background radial gradient */}
        <radialGradient id="boardBg" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#1e2d50" />
          <stop offset="100%" stopColor="#0e1529" />
        </radialGradient>
        {/* PayDay glow filter */}
        <filter id="payDayGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feFlood floodColor="#2ecc71" floodOpacity="0.4" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Inner shadow for depth on board background */}
        <filter id="innerShadow" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feOffset dx="0" dy="2" result="offsetBlur" />
          <feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
        </filter>
      </defs>

      {/* Background with radial gradient */}
      <rect x={0} y={0} width={BOARD_SIZE} height={BOARD_SIZE} rx={16} fill="url(#boardBg)" />
      {/* Subtle border */}
      <rect x={0} y={0} width={BOARD_SIZE} height={BOARD_SIZE} rx={16} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={2} />

      {/* Center info panel */}
      <g>
        {/* Panel background */}
        <rect
          x={BOARD_SIZE / 2 - 150}
          y={BOARD_SIZE / 2 - 90}
          width={300}
          height={180}
          rx={16}
          fill="rgba(0,0,0,0.35)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />
        {/* "RAT RACE" title */}
        <text
          x={BOARD_SIZE / 2}
          y={BOARD_SIZE / 2 - 55}
          textAnchor="middle"
          fill="rgba(255,255,255,0.12)"
          fontSize={28}
          fontWeight={800}
          letterSpacing={3}
        >
          RAT RACE
        </text>
        {/* Turn number */}
        <text
          x={BOARD_SIZE / 2}
          y={BOARD_SIZE / 2 - 20}
          textAnchor="middle"
          fill="rgba(255,255,255,0.4)"
          fontSize={13}
        >
          Turn {gameState.turnNumber}
        </text>
        {/* Current player name */}
        {currentPlayer && (
          <text
            x={BOARD_SIZE / 2}
            y={BOARD_SIZE / 2 + 10}
            textAnchor="middle"
            fill={currentPlayerColor}
            fontSize={18}
            fontWeight={700}
          >
            {currentPlayer.name}
          </text>
        )}
        {/* Turn phase */}
        <text
          x={BOARD_SIZE / 2}
          y={BOARD_SIZE / 2 + 35}
          textAnchor="middle"
          fill="rgba(255,255,255,0.5)"
          fontSize={12}
          fontWeight={600}
          letterSpacing={1}
        >
          {formatPhase(gameState.turnPhase)}
        </text>
        {/* Dice result */}
        {lastDice && (
          <text
            x={BOARD_SIZE / 2}
            y={BOARD_SIZE / 2 + 60}
            textAnchor="middle"
            fill="rgba(255,255,255,0.6)"
            fontSize={14}
            fontWeight={600}
          >
            {'\uD83C\uDFB2'} {lastDice[0]} + {lastDice[1]} = {lastDice[0] + lastDice[1]}
          </text>
        )}
      </g>

      {/* Fast Track label (only when active) */}
      {hasFastTrackPlayers && (
        <text
          x={BOARD_SIZE / 2}
          y={-FT_SPACE_H / 2 - 4}
          textAnchor="middle"
          fill="rgba(241, 196, 15, 0.4)"
          fontSize={14}
          fontWeight={700}
          letterSpacing={4}
        >
          FAST TRACK
        </text>
      )}

      {/* Fast Track spaces (outer loop) */}
      {FAST_TRACK_SPACES.map((space) => (
        <FastTrackSpaceRect key={`ft-${space.index}`} space={space} />
      ))}

      {/* Rat Race board spaces */}
      {RAT_RACE_SPACES.map((space) => (
        <SpaceRect key={space.index} space={space} />
      ))}

      {/* Rat Race player tokens */}
      {gameState.players
        .map((player, idx) => ({ player, idx }))
        .filter(({ player }) => !player.isInFastTrack)
        .map(({ player, idx }) => {
          const pos = getSpacePosition(player.position, RAT_RACE_SPACES.length);
          return (
            <PlayerToken
              key={player.id}
              playerIndex={idx}
              x={pos.x + SPACE_W / 2 + (idx - gameState.players.length / 2) * 14}
              y={pos.y + SPACE_H + 12}
              isCurrentPlayer={idx === gameState.currentPlayerIndex}
              name={player.name}
            />
          );
        })}

      {/* Fast Track player tokens */}
      {gameState.players
        .map((player, idx) => ({ player, idx }))
        .filter(({ player }) => player.isInFastTrack)
        .map(({ player, idx }) => {
          const pos = getFastTrackPosition(player.fastTrackPosition);
          return (
            <PlayerToken
              key={`ft-${player.id}`}
              playerIndex={idx}
              x={pos.x + FT_SPACE_W / 2 + (idx - gameState.players.length / 2) * 14}
              y={pos.y + FT_SPACE_H + 10}
              isCurrentPlayer={idx === gameState.currentPlayerIndex}
              name={player.name}
            />
          );
        })}
    </svg>
  );
}
