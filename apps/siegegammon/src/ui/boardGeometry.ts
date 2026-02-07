/**
 * Board geometry for SiegeGammon.
 *
 * Matches the existing board SVG asset (900×700 viewBox).
 * All coordinates are derived from the actual SVG polygon positions.
 *
 * Board layout (canonical, Player 1 perspective):
 *   Bottom row: points 1-6 (right, R→L), 7-12 (left, R→L)
 *   Top row: points 13-18 (left, L→R), 19-24 (right, L→R)
 *   Center bar at x=430..470
 *
 * Player 1 garrison: points 1-6 (bottom right)
 * Player 1 siege zone: points 19-24 (top right)
 * Player 2 garrison: points 19-24 from P2 perspective = canonical 1-6
 * Player 2 siege zone: points 1-6 from P2 perspective = canonical 19-24
 */

import type { PlayerId } from '@mcp-tool-shop/siege-types';

// ── Types ────────────────────────────────────────────────────────────

export type Vec2 = { x: number; y: number };
export type StackDir = 'up' | 'down';

export interface PointGeom {
  /** Canonical point number 1-24 */
  canonical: number;
  /** Direction checkers stack from anchor */
  dir: StackDir;
  /** Center x of the triangle (where checkers sit) */
  cx: number;
  /** Triangle polygon points for rendering */
  polygon: string;
  /** First checker anchor position */
  anchor: Vec2;
}

export interface ZoneGeom {
  /** Anchor position for first checker */
  anchor: Vec2;
  /** Stacking direction */
  dir: StackDir;
  /** Label position */
  label: Vec2;
}

// ── Board constants ──────────────────────────────────────────────────

export const BOARD = {
  viewBox: '0 0 900 700',
  width: 900,
  height: 700,
} as const;

/** Checker radius in board SVG units */
export const CHECKER_R = 12;

/** Center-to-center distance between stacked checkers */
export const CHECKER_STEP = 26;

/** Max checkers to show before compressing the stack */
export const MAX_VISIBLE_STACK = 5;

// ── Point geometry ───────────────────────────────────────────────────
//
// Extracted from the board SVG polygon coordinates.
// Each point is a triangle; we need the center x and the anchor y.

const POINT_WIDTH = 30;

// Bottom row: base y = 670, tip y = 400
// Top row: base y = 30, tip y = 300

const BOTTOM_BASE_Y = 670;
const BOTTOM_ANCHOR_Y = BOTTOM_BASE_Y - CHECKER_R - 2;
const TOP_BASE_Y = 30;
const TOP_ANCHOR_Y = TOP_BASE_Y + CHECKER_R + 2;

/**
 * Center x for each point, extracted from the SVG polygons.
 * Bottom right (1-6): midpoints of polygon base edges going R→L
 * Bottom left (7-12): same pattern left of bar
 * Top left (13-18): L→R left of bar
 * Top right (19-24): L→R right of bar
 */
const POINT_CX: Record<number, number> = {
  // Bottom right: points 1-6 (right to left)
  1: 855, 2: 825, 3: 795, 4: 765, 5: 735, 6: 705,
  // Bottom left: points 7-12 (right to left)
  7: 415, 8: 385, 9: 355, 10: 325, 11: 295, 12: 265,
  // Top left: points 13-18 (left to right)
  13: 265, 14: 295, 15: 325, 16: 355, 17: 385, 18: 415,
  // Top right: points 19-24 (left to right)
  19: 485, 20: 515, 21: 545, 22: 575, 23: 605, 24: 635,
};

function makeBottomPoint(canonical: number): PointGeom {
  const cx = POINT_CX[canonical]!;
  const left = cx - POINT_WIDTH / 2;
  const right = cx + POINT_WIDTH / 2;
  return {
    canonical,
    dir: 'up',
    cx,
    polygon: `${right},${BOTTOM_BASE_Y} ${left},${BOTTOM_BASE_Y} ${cx},400`,
    anchor: { x: cx, y: BOTTOM_ANCHOR_Y },
  };
}

function makeTopPoint(canonical: number): PointGeom {
  const cx = POINT_CX[canonical]!;
  const left = cx - POINT_WIDTH / 2;
  const right = cx + POINT_WIDTH / 2;
  return {
    canonical,
    dir: 'down',
    cx,
    polygon: `${left},${TOP_BASE_Y} ${right},${TOP_BASE_Y} ${cx},300`,
    anchor: { x: cx, y: TOP_ANCHOR_Y },
  };
}

/** All 24 point geometries, keyed by canonical number */
export const POINTS: Record<number, PointGeom> = {};
for (let i = 1; i <= 12; i++) POINTS[i] = makeBottomPoint(i);
for (let i = 13; i <= 24; i++) POINTS[i] = makeTopPoint(i);

// ── Zone geometry (reserve + locked trays) ───────────────────────────
//
// Reserve trays sit outside the play area.
// Player 1: bottom-left tray area
// Player 2: top-right tray area
// Locked (siege): opposite side from each player's reserve

// Left tray area: x ≈ 30..120
// Right tray area: x ≈ 780..870
// We put reserve/locked indicators in these zones

export const ZONES = {
  reserveP1: {
    anchor: { x: 120, y: 600 },
    dir: 'up' as StackDir,
    label: { x: 120, y: 685 },
  },
  reserveP2: {
    anchor: { x: 780, y: 100 },
    dir: 'down' as StackDir,
    label: { x: 780, y: 22 },
  },
  lockedP1: {
    anchor: { x: 120, y: 100 },
    dir: 'down' as StackDir,
    label: { x: 120, y: 22 },
  },
  lockedP2: {
    anchor: { x: 780, y: 600 },
    dir: 'up' as StackDir,
    label: { x: 780, y: 685 },
  },
  dice: {
    anchor: { x: 450, y: 350 },
    dir: 'down' as StackDir,
    label: { x: 450, y: 380 },
  },
} as const;

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Compute the (x, y) position for a checker at a given stack index.
 * Index 0 = nearest to base, stacking away from base.
 */
export function stackPosition(anchor: Vec2, dir: StackDir, index: number): Vec2 {
  const step = Math.min(CHECKER_STEP, CHECKER_STEP); // room for future compression
  const dy = step * index * (dir === 'up' ? -1 : 1);
  return { x: anchor.x, y: anchor.y + dy };
}

/**
 * Compute stack position with compression for large stacks.
 * When count > MAX_VISIBLE_STACK, checkers compress to fit.
 */
export function compressedStackPosition(
  anchor: Vec2,
  dir: StackDir,
  index: number,
  total: number,
): Vec2 {
  const maxHeight = CHECKER_STEP * (MAX_VISIBLE_STACK - 1);
  const step = total <= MAX_VISIBLE_STACK
    ? CHECKER_STEP
    : maxHeight / (total - 1);
  const dy = step * index * (dir === 'up' ? -1 : 1);
  return { x: anchor.x, y: anchor.y + dy };
}

/**
 * Get the zone key for a player's reserve or locked area.
 */
export function reserveZone(player: PlayerId): keyof typeof ZONES {
  return player === 'player1' ? 'reserveP1' : 'reserveP2';
}

export function lockedZone(player: PlayerId): keyof typeof ZONES {
  return player === 'player1' ? 'lockedP1' : 'lockedP2';
}
