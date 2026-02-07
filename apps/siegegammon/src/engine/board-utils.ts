import type {
  GameState,
  PlayerId,
  CheckerState,
  PointState,
} from '@mcp-tool-shop/siege-types';

// ── Perspective conversion ──────────────────────────────────────────
// Player 1: identity (canonical === perspective)
// Player 2: mirror — perspective point N = canonical 25 - N

export function toCanonical(perspectivePoint: number, player: PlayerId): number {
  return player === 'player1' ? perspectivePoint : 25 - perspectivePoint;
}

export function toPerspective(canonicalPoint: number, player: PlayerId): number {
  return player === 'player1' ? canonicalPoint : 25 - canonicalPoint;
}

export function opponent(player: PlayerId): PlayerId {
  return player === 'player1' ? 'player2' : 'player1';
}

// ── Point queries (canonical point numbers) ─────────────────────────

export function getPoint(state: GameState, canonicalPoint: number): PointState {
  return state.board[canonicalPoint - 1]!;
}

export function getCheckersAt(state: GameState, canonicalPoint: number): CheckerState[] {
  return getPoint(state, canonicalPoint).checkers;
}

export function isPointEmpty(state: GameState, canonicalPoint: number): boolean {
  return getCheckersAt(state, canonicalPoint).length === 0;
}

export function isPointBlot(
  state: GameState,
  canonicalPoint: number,
  forPlayer: PlayerId,
): boolean {
  const checkers = getCheckersAt(state, canonicalPoint);
  const opp = opponent(forPlayer);
  return checkers.length === 1 && checkers[0]!.owner === opp;
}

export function isPointFortified(
  state: GameState,
  canonicalPoint: number,
  byPlayer: PlayerId,
): boolean {
  const checkers = getCheckersAt(state, canonicalPoint);
  return checkers.length >= 2 && checkers.every((c) => c.owner === byPlayer);
}

export function isPointBlocked(
  state: GameState,
  canonicalPoint: number,
  forPlayer: PlayerId,
): boolean {
  const checkers = getCheckersAt(state, canonicalPoint);
  const opp = opponent(forPlayer);
  return checkers.filter((c) => c.owner === opp).length >= 2;
}

// ── Zone queries (canonical point) ──────────────────────────────────

export function isInSiegeZone(canonicalPoint: number, player: PlayerId): boolean {
  if (player === 'player1') {
    return canonicalPoint >= 19 && canonicalPoint <= 24;
  }
  return canonicalPoint >= 1 && canonicalPoint <= 6;
}

export function isInGarrison(canonicalPoint: number, player: PlayerId): boolean {
  if (player === 'player1') {
    return canonicalPoint >= 1 && canonicalPoint <= 6;
  }
  return canonicalPoint >= 19 && canonicalPoint <= 24;
}

// ── Aggregate queries ───────────────────────────────────────────────

export function getReserveCount(state: GameState, player: PlayerId): number {
  return state.reserves[player].length;
}

export function getLockedCount(state: GameState, player: PlayerId): number {
  return state.locked[player].length;
}

export function getBoardCheckers(state: GameState, player: PlayerId): CheckerState[] {
  const result: CheckerState[] = [];
  for (const point of state.board) {
    for (const checker of point.checkers) {
      if (checker.owner === player) {
        result.push(checker);
      }
    }
  }
  return result;
}

export function getHighestOccupiedSiegePoint(
  state: GameState,
  player: PlayerId,
): number | null {
  // Returns the highest PERSPECTIVE point in the Siege Zone (19-24) that has
  // an unlocked friendly checker. null if none.
  let highest: number | null = null;

  for (const point of state.board) {
    const canonicalPt = point.index;
    if (!isInSiegeZone(canonicalPt, player)) continue;

    const hasFriendlyUnlocked = point.checkers.some(
      (c) => c.owner === player && !c.isLocked,
    );
    if (!hasFriendlyUnlocked) continue;

    const perspectivePt = toPerspective(canonicalPt, player);
    if (highest === null || perspectivePt > highest) {
      highest = perspectivePt;
    }
  }

  return highest;
}
