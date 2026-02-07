import React from 'react';
import type { Theme } from '../../../themes/index.js';
import { BOARD, POINTS } from '../../boardGeometry.js';

interface BoardSurfaceProps {
  theme: Theme;
}

const ZONE_LABELS: Array<{ x: number; y: number; text: string }> = [
  // Bottom-right (points 1-6) — Player 1 garrison
  { x: 780, y: 690, text: 'GARRISON' },
  // Bottom-left (points 7-12)
  { x: 340, y: 690, text: 'FIELD' },
  // Top-left (points 13-18)
  { x: 340, y: 18, text: 'FIELD' },
  // Top-right (points 19-24) — Siege zone
  { x: 560, y: 18, text: 'SIEGE ZONE' },
];

export const BoardSurface: React.FC<BoardSurfaceProps> = ({ theme }) => {
  return (
    <g data-layer="board-surface">
      <defs>
        <linearGradient id="frame-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.frame.light} />
          <stop offset="100%" stopColor={theme.frame.dark} />
        </linearGradient>
        <linearGradient id="felt-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.felt.light} />
          <stop offset="100%" stopColor={theme.felt.dark} />
        </linearGradient>
      </defs>

      {/* Outer frame */}
      <rect
        x={0}
        y={0}
        width={BOARD.width}
        height={BOARD.height}
        rx={12}
        fill="url(#frame-grad)"
      />

      {/* Inner felt surface */}
      <rect
        x={30}
        y={30}
        width={840}
        height={640}
        rx={4}
        fill="url(#felt-grad)"
      />

      {/* Center bar */}
      <rect
        x={430}
        y={30}
        width={40}
        height={640}
        fill={theme.frame.dark}
      />

      {/* 24 triangle points */}
      {Array.from({ length: 24 }, (_, i) => {
        const canonical = i + 1;
        const point = POINTS[canonical]!;
        const fill = canonical % 2 === 1 ? theme.points.a : theme.points.b;
        return (
          <polygon
            key={canonical}
            points={point.polygon}
            fill={fill}
            opacity={0.9}
            stroke={fill}
            strokeWidth={0.5}
            strokeOpacity={0.6}
          />
        );
      })}

      {/* Zone labels */}
      {ZONE_LABELS.map((label) => (
        <text
          key={`${label.text}-${label.x}-${label.y}`}
          x={label.x}
          y={label.y}
          textAnchor="middle"
          fill={theme.accent.primary}
          opacity={0.5}
          fontFamily="Georgia, serif"
          fontSize={11}
          fontWeight="bold"
          letterSpacing={2}
        >
          {label.text}
        </text>
      ))}
    </g>
  );
};
