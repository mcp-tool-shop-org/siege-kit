import type { DiceRoll } from '@mcp-tool-shop/siege-types';
import type { Theme } from '../../themes/index.js';

interface DiceDisplayProps {
  dice: DiceRoll | null;
  theme: Theme;
}

/**
 * Pip positions within a die face, normalised to a 0..1 coordinate space.
 * Each layout maps a face value (1-6) to an array of (cx, cy) pairs.
 */
const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.72, 0.28], [0.28, 0.72]],
  3: [[0.72, 0.28], [0.5, 0.5], [0.28, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.22], [0.72, 0.22], [0.28, 0.5], [0.72, 0.5], [0.28, 0.78], [0.72, 0.78]],
};

const DIE_SIZE = 50;
const DIE_RX = 8;
const PIP_R = 4;

function DieFace({
  value,
  x,
  y,
  dimmed,
  theme,
}: {
  value: number;
  x: number;
  y: number;
  dimmed: boolean;
  theme: Theme;
}) {
  const pips = PIP_LAYOUTS[value] ?? [];
  return (
    <g opacity={dimmed ? 0.3 : 1}>
      <rect
        x={x}
        y={y}
        width={DIE_SIZE}
        height={DIE_SIZE}
        rx={DIE_RX}
        ry={DIE_RX}
        fill={theme.dice.face}
        stroke={theme.dice.pips}
        strokeWidth={1.5}
      />
      {pips.map(([px, py], i) => (
        <circle
          key={i}
          cx={x + px * DIE_SIZE}
          cy={y + py * DIE_SIZE}
          r={PIP_R}
          fill={theme.dice.pips}
        />
      ))}
    </g>
  );
}

/**
 * Renders the current dice roll as SVG elements inside the board.
 *
 * For doubles, a small remaining-uses indicator is shown beneath the dice.
 */
export function DiceDisplay({ dice, theme }: DiceDisplayProps) {
  if (!dice) return null;

  const [v1, v2] = dice.values;

  if (dice.isDoubles) {
    // Doubles: both dice show the same value.
    // Track how many of the 4 uses remain.
    const remaining = dice.movesAvailable - dice.movesUsed;
    const dimmed = remaining === 0;

    return (
      <g>
        <DieFace value={v1} x={395} y={315} dimmed={dimmed} theme={theme} />
        <DieFace value={v2} x={455} y={315} dimmed={dimmed} theme={theme} />
        {/* Remaining uses indicator */}
        <g transform="translate(450, 380)">
          {Array.from({ length: 4 }).map((_, i) => (
            <circle
              key={i}
              cx={(i - 1.5) * 14}
              cy={0}
              r={4}
              fill={i < remaining ? theme.accent.primary : theme.dice.faceAlt}
              opacity={i < remaining ? 1 : 0.3}
            />
          ))}
        </g>
      </g>
    );
  }

  // Non-doubles: each die is used individually.
  const v1Used = dice.usedValues.includes(v1);
  const v2Used = dice.usedValues.includes(v2);

  // If both dice have the same value but only one is used, only dim one.
  let dim1 = false;
  let dim2 = false;
  if (v1 === v2) {
    // Same values but not doubles (shouldn't happen in normal play,
    // but handle defensively). Dim based on how many are used.
    dim1 = dice.movesUsed >= 1;
    dim2 = dice.movesUsed >= 2;
  } else {
    dim1 = v1Used;
    dim2 = v2Used;
  }

  return (
    <g>
      <DieFace value={v1} x={395} y={315} dimmed={dim1} theme={theme} />
      <DieFace value={v2} x={455} y={315} dimmed={dim2} theme={theme} />
    </g>
  );
}
