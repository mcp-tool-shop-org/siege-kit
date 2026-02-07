import React from 'react';
import type { Theme } from '../../../themes/index.js';
import type { GameState, PlayerId } from '@mcp-tool-shop/siege-types';
import { POINTS, CHECKER_R, compressedStackPosition } from '../../boardGeometry.js';

interface CheckersLayerProps {
  gameState: GameState;
  theme: Theme;
  selectedCheckerId: string | null;
  onSelectChecker: (checkerId: string) => void;
}

function checkerColors(owner: PlayerId, theme: Theme) {
  return owner === 'player1' ? theme.player1 : theme.player2;
}

export const CheckersLayer: React.FC<CheckersLayerProps> = ({
  gameState,
  theme,
  selectedCheckerId,
  onSelectChecker,
}) => {
  return (
    <g data-layer="checkers">
      {gameState.board.map((pointState) => {
        const point = POINTS[pointState.index]!;
        const total = pointState.checkers.length;

        return pointState.checkers.map((checker, index) => {
          const pos = compressedStackPosition(
            point.anchor,
            point.dir,
            index,
            total,
          );
          const colors = checkerColors(checker.owner, theme);
          const isSelected = checker.id === selectedCheckerId;
          const isCurrentPlayer = checker.owner === gameState.currentPlayer;

          return (
            <g
              key={checker.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              style={{
                transition: 'transform 200ms ease-out',
                cursor: isCurrentPlayer ? 'pointer' : 'default',
              }}
              onPointerDown={
                isCurrentPlayer
                  ? (e: React.PointerEvent) => {
                      e.stopPropagation();
                      onSelectChecker(checker.id);
                    }
                  : undefined
              }
            >
              {/* Main checker body */}
              <circle
                r={CHECKER_R}
                fill={colors.face}
                stroke={isSelected ? colors.highlight : colors.shadow}
                strokeWidth={isSelected ? 2 : 0.5}
              />

              {/* Inner ring detail */}
              <circle
                r={CHECKER_R - 3}
                fill="none"
                stroke={colors.highlight}
                strokeWidth={0.8}
                opacity={0.35}
              />

              {/* Selected highlight ring */}
              {isSelected && (
                <circle
                  r={CHECKER_R + 2}
                  fill="none"
                  stroke={colors.highlight}
                  strokeWidth={1.5}
                  opacity={0.8}
                />
              )}
            </g>
          );
        });
      })}
    </g>
  );
};
