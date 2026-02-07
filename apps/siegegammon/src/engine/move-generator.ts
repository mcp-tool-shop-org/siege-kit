import type {
  GameState,
  PlayerId,
  Move,
  DiceRoll,
} from '@mcp-tool-shop/siege-types';

import {
  toCanonical,
  toPerspective,
  isPointBlot,
  getReserveCount,
  getBoardCheckers,
  getCheckersAt,
  opponent,
} from './board-utils.js';

import { getRemainingDice, useDie } from './dice.js';

import {
  isLegalDeploy,
  isLegalAdvance,
} from './move-validator.js';

import { executeMove, cloneState } from './move-executor.js';

// ── Individual move generation ──────────────────────────────────────

/**
 * Generate all legal individual moves for a specific die value.
 *
 * Obligation rule: if the player has checkers in reserve, ONLY deploy
 * moves are generated (must deploy before advancing).
 */
export function generateMovesForDie(
  state: GameState,
  player: PlayerId,
  dieValue: number,
): Move[] {
  const moves: Move[] = [];

  if (getReserveCount(state, player) > 0) {
    // Must deploy from reserve first
    if (isLegalDeploy(state, player, dieValue)) {
      const canonicalTarget = toCanonical(dieValue, player);
      const opp = opponent(player);
      const targetCheckers = getCheckersAt(state, canonicalTarget);
      const blotChecker = isPointBlot(state, canonicalTarget, player)
        ? targetCheckers.find((c) => c.owner === opp)
        : undefined;

      // Pick the first available reserve checker
      const reserveChecker = state.reserves[player][0]!;

      const move: Move = {
        type: 'deploy',
        checkerId: reserveChecker.id,
        from: { zone: 'reserve' },
        to: { zone: 'board', point: canonicalTarget },
        dieValue,
        ...(blotChecker ? { hits: blotChecker.id } : {}),
      };

      moves.push(move);
    }
    return moves;
  }

  // No reserve checkers — generate advance moves for all board checkers
  const boardCheckers = getBoardCheckers(state, player);

  for (const checker of boardCheckers) {
    // Skip locked checkers (they shouldn't appear from getBoardCheckers, but guard)
    if (checker.isLocked) continue;
    if (checker.position.zone !== 'board') continue;

    if (!isLegalAdvance(state, checker.id, dieValue, player)) continue;

    const fromCanonical = checker.position.point;
    const fromPerspective = toPerspective(fromCanonical, player);
    const targetPerspective = fromPerspective + dieValue;

    if (targetPerspective >= 19) {
      // Enters siege zone or overshoots — checker gets locked
      const move: Move = {
        type: 'advance',
        checkerId: checker.id,
        from: { zone: 'board', point: fromCanonical },
        to: { zone: 'locked' },
        dieValue,
      };
      moves.push(move);
    } else {
      // Normal advance
      const targetCanonical = toCanonical(targetPerspective, player);
      const opp = opponent(player);
      const blotChecker = isPointBlot(state, targetCanonical, player)
        ? getCheckersAt(state, targetCanonical).find((c) => c.owner === opp)
        : undefined;

      const move: Move = {
        type: 'advance',
        checkerId: checker.id,
        from: { zone: 'board', point: fromCanonical },
        to: { zone: 'board', point: targetCanonical },
        dieValue,
        ...(blotChecker ? { hits: blotChecker.id } : {}),
      };
      moves.push(move);
    }
  }

  return moves;
}

// ── All legal moves (union across remaining dice) ───────────────────

/**
 * Returns all individual legal moves considering remaining dice.
 * Deduplicates die values (e.g., doubles [4,4,4,4] only checks 4 once).
 */
export function generateAllLegalMoves(
  state: GameState,
  player: PlayerId,
  dice: DiceRoll,
): Move[] {
  const remaining = getRemainingDice(dice);
  const uniqueValues = [...new Set(remaining)];
  const allMoves: Move[] = [];

  for (const dieValue of uniqueValues) {
    const movesForDie = generateMovesForDie(state, player, dieValue);
    allMoves.push(...movesForDie);
  }

  return allMoves;
}

// ── Obligation-enforced move sequences ──────────────────────────────

/**
 * Generate all legal complete move sequences enforcing dice obligation rules.
 *
 * Rules:
 * 1. Player MUST use as many dice as possible (maximize dice used).
 * 2. If only one die can be used (not both), MUST use the larger one.
 * 3. For doubles: up to 4 moves, maximize dice used.
 *
 * Returns Move[][] — each inner array is one valid complete turn of moves.
 */
export function generateLegalMoveSequences(
  state: GameState,
  player: PlayerId,
  dice: DiceRoll,
): Move[][] {
  const maxDepth = dice.movesAvailable - dice.movesUsed;
  if (maxDepth <= 0) return [];

  const allSequences: Move[][] = [];
  buildSequences(state, player, dice, [], allSequences, maxDepth);

  if (allSequences.length === 0) return [];

  // Find the maximum number of dice used in any sequence
  let maxDiceUsed = 0;
  for (const seq of allSequences) {
    if (seq.length > maxDiceUsed) {
      maxDiceUsed = seq.length;
    }
  }

  // Filter to only sequences that use the max count
  let filtered = allSequences.filter((seq) => seq.length === maxDiceUsed);

  // Obligation rule: if max count is 1 and non-doubles, must use the larger die
  if (maxDiceUsed === 1 && !dice.isDoubles) {
    const remaining = getRemainingDice(dice);
    if (remaining.length === 2) {
      const largerDie = Math.max(remaining[0]!, remaining[1]!);
      const largerOnly = filtered.filter(
        (seq) => seq[0]!.dieValue === largerDie,
      );
      // Only apply the larger-die rule if there are sequences using the larger die
      if (largerOnly.length > 0) {
        filtered = largerOnly;
      }
    }
  }

  return filtered;
}

/**
 * Recursive DFS to build all possible move sequences.
 */
function buildSequences(
  state: GameState,
  player: PlayerId,
  dice: DiceRoll,
  currentSeq: Move[],
  allSequences: Move[][],
  maxDepth: number,
): void {
  if (currentSeq.length >= maxDepth) {
    allSequences.push([...currentSeq]);
    return;
  }

  const legalMoves = generateAllLegalMoves(state, player, dice);

  if (legalMoves.length === 0) {
    // No more moves possible — this is a leaf node
    // Only record sequences that used at least one die
    if (currentSeq.length > 0) {
      allSequences.push([...currentSeq]);
    }
    return;
  }

  for (const move of legalMoves) {
    // Ensure state has dice set so executeMove can consume the die value
    const stateWithDice = ensureDice(state, dice);
    const nextState = executeMove(stateWithDice, move);
    const nextDice = useDie(dice, move.dieValue);

    currentSeq.push(move);
    buildSequences(nextState, player, nextDice, currentSeq, allSequences, maxDepth);
    currentSeq.pop();
  }
}

/**
 * Ensures the GameState has the given DiceRoll set.
 * executeMove internally does `useDie(next.dice!, ...)` so dice must be non-null.
 */
function ensureDice(state: GameState, dice: DiceRoll): GameState {
  if (state.dice === dice) return state;
  const next = cloneState(state);
  next.dice = dice;
  return next;
}
