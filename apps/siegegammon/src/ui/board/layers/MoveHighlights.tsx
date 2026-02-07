import React from 'react';
import type { Theme } from '../../../themes/index.js';
import type { Move, PlayerId } from '@mcp-tool-shop/siege-types';
import { POINTS, CHECKER_R, ZONES, lockedZone } from '../../boardGeometry.js';

interface MoveHighlightsProps {
  movesForSelected: Move[];
  theme: Theme;
  currentPlayer: PlayerId;
  onExecuteMove: (move: Move) => void;
}

export const MoveHighlights: React.FC<MoveHighlightsProps> = ({
  movesForSelected,
  theme,
  currentPlayer,
  onExecuteMove,
}) => {
  if (movesForSelected.length === 0) return null;

  return (
    <g data-layer="move-highlights">
      <style>
        {`
          @keyframes sg-pulse {
            0%, 100% { opacity: 0.4; r: ${CHECKER_R + 2}; }
            50% { opacity: 0.65; r: ${CHECKER_R + 5}; }
          }
          .sg-highlight-pulse {
            animation: sg-pulse 1.2s ease-in-out infinite;
          }
        `}
      </style>

      {movesForSelected.map((move, i) => {
        let cx: number;
        let cy: number;

        if (move.to.zone === 'board') {
          const point = POINTS[move.to.point]!;
          cx = point.anchor.x;
          cy = point.anchor.y;
        } else if (move.to.zone === 'locked') {
          const zone = ZONES[lockedZone(currentPlayer)];
          cx = zone.anchor.x;
          cy = zone.anchor.y;
        } else {
          return null;
        }

        return (
          <g
            key={`move-${move.to.zone}-${move.to.zone === 'board' ? move.to.point : 'locked'}-${move.dieValue}-${i}`}
            style={{ cursor: 'pointer' }}
            onPointerDown={(e: React.PointerEvent) => {
              e.stopPropagation();
              onExecuteMove(move);
            }}
          >
            {/* Pulsing destination indicator */}
            <circle
              cx={cx}
              cy={cy}
              r={CHECKER_R + 2}
              fill={theme.accent.secondary}
              className="sg-highlight-pulse"
            />

            {/* Die value label */}
            <text
              x={cx}
              y={cy - CHECKER_R - 6}
              textAnchor="middle"
              dominantBaseline="auto"
              fill={theme.accent.primary}
              fontSize={10}
              fontFamily="Georgia, serif"
              fontWeight="bold"
            >
              {move.dieValue}
            </text>

            {/* Hit indicator */}
            {move.hits && (
              <text
                x={cx}
                y={cy + CHECKER_R + 12}
                textAnchor="middle"
                dominantBaseline="auto"
                fill={theme.accent.primary}
                fontSize={8}
                fontFamily="Georgia, serif"
                opacity={0.7}
              >
                HIT
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
};
