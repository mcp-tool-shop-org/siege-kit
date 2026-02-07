import React from 'react';
import type { Theme } from '../../../themes/index.js';
import type { GameState, PlayerId, CheckerState } from '@mcp-tool-shop/siege-types';
import {
  ZONES,
  CHECKER_R,
  compressedStackPosition,
  reserveZone,
  lockedZone,
} from '../../boardGeometry.js';

interface ReserveAndSiegeProps {
  gameState: GameState;
  theme: Theme;
  selectedCheckerId: string | null;
  onSelectChecker: (checkerId: string) => void;
}

const PLAYERS: PlayerId[] = ['player1', 'player2'];

function renderCheckerStack(
  checkers: CheckerState[],
  zone: (typeof ZONES)[keyof typeof ZONES],
  theme: Theme,
  currentPlayer: PlayerId,
  selectedCheckerId: string | null,
  onSelectChecker: (checkerId: string) => void,
  isReserve: boolean,
  glowColor: string | null,
) {
  const maxVisible = 8;
  const visible = checkers.slice(0, maxVisible);
  const total = visible.length;

  return visible.map((checker, index) => {
    const pos = compressedStackPosition(zone.anchor, zone.dir, index, total);
    const colors = checker.owner === 'player1' ? theme.player1 : theme.player2;
    const isSelected = checker.id === selectedCheckerId;
    const isClickable = isReserve && checker.owner === currentPlayer;

    return (
      <g
        key={checker.id}
        transform={`translate(${pos.x}, ${pos.y})`}
        style={{
          transition: 'transform 200ms ease-out',
          cursor: isClickable ? 'pointer' : 'default',
          filter: glowColor
            ? `drop-shadow(0 0 3px ${glowColor})`
            : undefined,
        }}
        onPointerDown={
          isClickable
            ? (e: React.PointerEvent) => {
                e.stopPropagation();
                onSelectChecker(checker.id);
              }
            : undefined
        }
      >
        {/* Checker body */}
        <circle
          r={CHECKER_R}
          fill={colors.face}
          stroke={isSelected ? colors.highlight : colors.shadow}
          strokeWidth={isSelected ? 2 : 0.5}
        />

        {/* Inner ring */}
        <circle
          r={CHECKER_R - 3}
          fill="none"
          stroke={colors.highlight}
          strokeWidth={0.8}
          opacity={0.35}
        />

        {/* Selected highlight */}
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
}

export const ReserveAndSiege: React.FC<ReserveAndSiegeProps> = ({
  gameState,
  theme,
  selectedCheckerId,
  onSelectChecker,
}) => {
  return (
    <g data-layer="reserve-and-siege">
      {PLAYERS.map((player) => {
        const resZoneKey = reserveZone(player);
        const resZone = ZONES[resZoneKey];
        const resCheckers = gameState.reserves[player];

        const lckZoneKey = lockedZone(player);
        const lckZone = ZONES[lckZoneKey];
        const lckCheckers = gameState.locked[player];

        const glowColor = theme.lockedGlow[player];

        return (
          <g key={player}>
            {/* Reserve zone */}
            <g data-zone={`reserve-${player}`}>
              {renderCheckerStack(
                resCheckers,
                resZone,
                theme,
                gameState.currentPlayer,
                selectedCheckerId,
                onSelectChecker,
                true,
                null,
              )}

              {/* Reserve count label */}
              {resCheckers.length > 0 && (
                <text
                  x={resZone.label.x}
                  y={resZone.label.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={theme.accent.primary}
                  fontSize={12}
                  fontFamily="Georgia, serif"
                  fontWeight="bold"
                >
                  {`\u00d7${resCheckers.length}`}
                </text>
              )}
            </g>

            {/* Locked (siege) zone */}
            <g data-zone={`locked-${player}`}>
              {renderCheckerStack(
                lckCheckers,
                lckZone,
                theme,
                gameState.currentPlayer,
                selectedCheckerId,
                onSelectChecker,
                false,
                glowColor,
              )}

              {/* Locked count label */}
              {lckCheckers.length > 0 && (
                <text
                  x={lckZone.label.x}
                  y={lckZone.label.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={theme.accent.primary}
                  fontSize={12}
                  fontFamily="Georgia, serif"
                  fontWeight="bold"
                >
                  {`\u00d7${lckCheckers.length}`}
                </text>
              )}
            </g>
          </g>
        );
      })}
    </g>
  );
};
