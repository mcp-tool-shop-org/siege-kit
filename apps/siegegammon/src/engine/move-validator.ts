import type {
  GameState,
  PlayerId,
  CheckerState,
  Move,
} from '@mcp-tool-shop/siege-types';

import {
  toCanonical,
  toPerspective,
  isPointBlocked,
  isPointBlot,
  isInSiegeZone,
  isInGarrison,
  getHighestOccupiedSiegePoint,
  getCheckersAt,
  opponent,
} from './board-utils.js';

// ── Landing legality ────────────────────────────────────────────────

/**
 * A landing is legal if the canonical point is:
 *   - empty, OR
 *   - has only friendly checkers, OR
 *   - has exactly 1 opponent checker (blot — will be hit)
 * Illegal if 2+ opponent checkers (fortified/blocked).
 */
export function isLegalLanding(
  state: GameState,
  canonicalPoint: number,
  player: PlayerId,
): boolean {
  if (canonicalPoint < 1 || canonicalPoint > 24) return false;
  return !isPointBlocked(state, canonicalPoint, player);
}

// ── Deploy legality ─────────────────────────────────────────────────

/**
 * Deploy: place from reserve into Garrison.
 * Die value 1-6 maps to perspective point = dieValue.
 * Must have reserve checkers. Landing must be legal.
 */
export function isLegalDeploy(
  state: GameState,
  player: PlayerId,
  dieValue: number,
): boolean {
  // Must have checkers in reserve
  if (state.reserves[player].length === 0) return false;

  // Die value must be 1-6
  if (dieValue < 1 || dieValue > 6) return false;

  // Perspective point = dieValue; convert to canonical
  const canonicalTarget = toCanonical(dieValue, player);

  // Verify it lands in the garrison (should always be true for 1-6)
  if (!isInGarrison(canonicalTarget, player)) return false;

  return isLegalLanding(state, canonicalTarget, player);
}

// ── Advance legality ────────────────────────────────────────────────

/**
 * Advance: move a checker forward by dieValue from its current board position.
 *
 * Target perspective = current perspective + dieValue
 * - If 19-24: enters Siege Zone (will be locked) -- always legal if landing OK
 * - If > 24: overshoot -- legal only if isLegalOvershoot
 * - If 1-18: normal advance -- check isLegalLanding
 */
export function isLegalAdvance(
  state: GameState,
  checkerId: string,
  dieValue: number,
  player: PlayerId,
): boolean {
  // Find the checker on the board
  const checker = findCheckerOnBoard(state, checkerId, player);
  if (!checker) return false;

  // Checker must be on the board (not locked, not in reserve)
  if (checker.position.zone !== 'board') return false;

  const fromCanonical = checker.position.point;
  const fromPerspective = toPerspective(fromCanonical, player);
  const targetPerspective = fromPerspective + dieValue;

  if (targetPerspective > 24) {
    // Overshoot
    return isLegalOvershoot(state, fromCanonical, dieValue, player);
  }

  if (targetPerspective >= 19 && targetPerspective <= 24) {
    // Enters Siege Zone -- will be locked. Still need legal landing.
    const targetCanonical = toCanonical(targetPerspective, player);
    return isLegalLanding(state, targetCanonical, player);
  }

  // Normal advance (target perspective 1-18)
  const targetCanonical = toCanonical(targetPerspective, player);
  return isLegalLanding(state, targetCanonical, player);
}

// ── Overshoot legality ──────────────────────────────────────────────

/**
 * Overshoot: die would take past point 24 (perspective).
 * Legal only if the checker is on the highest occupied perspective
 * point in the Siege Zone (no friendly non-locked checker sits on
 * a higher perspective point in 19-24).
 */
export function isLegalOvershoot(
  state: GameState,
  fromCanonical: number,
  _dieValue: number,
  player: PlayerId,
): boolean {
  // The checker must be in the Siege Zone to overshoot
  if (!isInSiegeZone(fromCanonical, player)) return false;

  const fromPerspective = toPerspective(fromCanonical, player);
  const highest = getHighestOccupiedSiegePoint(state, player);

  // Should not be null if checker is there, but guard
  if (highest === null) return false;

  // Legal only if this checker is at the highest (or equal) perspective point
  return fromPerspective >= highest;
}

// ── Full move validation ────────────────────────────────────────────

export type MoveValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

export function validateMove(
  state: GameState,
  move: Move,
  player: PlayerId,
): MoveValidationResult {
  if (move.type === 'deploy') {
    if (move.from.zone !== 'reserve') {
      return { valid: false, reason: 'Deploy must originate from reserve' };
    }

    // Verify the checker exists in reserve
    const inReserve = state.reserves[player].find((c) => c.id === move.checkerId);
    if (!inReserve) {
      return { valid: false, reason: 'Checker not found in reserve' };
    }

    if (!isLegalDeploy(state, player, move.dieValue)) {
      return { valid: false, reason: 'Deploy target is blocked or invalid' };
    }

    // Verify the 'to' matches expected target
    const expectedCanonical = toCanonical(move.dieValue, player);
    if (
      move.to.zone !== 'board' ||
      move.to.point !== expectedCanonical
    ) {
      return {
        valid: false,
        reason: `Deploy target must be canonical point ${expectedCanonical}`,
      };
    }

    // Check if a hit is claimed correctly
    const hitValidation = validateHit(state, expectedCanonical, player, move.hits);
    if (!hitValidation.valid) return hitValidation;

    return { valid: true };
  }

  if (move.type === 'advance') {
    if (move.from.zone !== 'board') {
      return { valid: false, reason: 'Advance must originate from board' };
    }

    if (!isLegalAdvance(state, move.checkerId, move.dieValue, player)) {
      return { valid: false, reason: 'Advance is not legal' };
    }

    // Compute expected destination
    const fromCanonical = move.from.point;
    const fromPerspective = toPerspective(fromCanonical, player);
    const targetPerspective = fromPerspective + move.dieValue;

    if (targetPerspective > 24) {
      // Overshoot -> lock
      if (move.to.zone !== 'locked') {
        return { valid: false, reason: 'Overshoot must result in locked position' };
      }
      return { valid: true };
    }

    const targetCanonical = toCanonical(targetPerspective, player);

    if (targetPerspective >= 19 && targetPerspective <= 24) {
      // Entering siege zone -> lock
      if (move.to.zone !== 'locked') {
        return { valid: false, reason: 'Entering Siege Zone must result in locked position' };
      }
    } else {
      // Normal advance
      if (move.to.zone !== 'board' || move.to.point !== targetCanonical) {
        return {
          valid: false,
          reason: `Advance target must be canonical point ${targetCanonical}`,
        };
      }

      const hitValidation = validateHit(state, targetCanonical, player, move.hits);
      if (!hitValidation.valid) return hitValidation;
    }

    return { valid: true };
  }

  return { valid: false, reason: `Unknown move type: ${(move as Move).type}` };
}

// ── Helpers ─────────────────────────────────────────────────────────

function findCheckerOnBoard(
  state: GameState,
  checkerId: string,
  player: PlayerId,
): CheckerState | undefined {
  for (const point of state.board) {
    for (const checker of point.checkers) {
      if (checker.id === checkerId && checker.owner === player) {
        return checker;
      }
    }
  }
  return undefined;
}

function validateHit(
  state: GameState,
  canonicalPoint: number,
  player: PlayerId,
  hits: string | undefined,
): MoveValidationResult {
  const isBlot = isPointBlot(state, canonicalPoint, player);

  if (isBlot && !hits) {
    return { valid: false, reason: 'Landing on a blot requires specifying the hit checker' };
  }

  if (!isBlot && hits) {
    return { valid: false, reason: 'Cannot hit — point is not a blot' };
  }

  if (isBlot && hits) {
    const opp = opponent(player);
    const checkers = getCheckersAt(state, canonicalPoint);
    const hitChecker = checkers.find((c) => c.id === hits && c.owner === opp);
    if (!hitChecker) {
      return { valid: false, reason: 'Hit checker not found at target point' };
    }
  }

  return { valid: true };
}
