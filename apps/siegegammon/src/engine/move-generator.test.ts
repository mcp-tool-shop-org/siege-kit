import { describe, it, expect } from 'vitest';
import type {
  GameState,
  PlayerId,
  CheckerState,
  PointState,
  DiceRoll,
} from '@mcp-tool-shop/siege-types';

import {
  generateMovesForDie,
  generateAllLegalMoves,
  generateLegalMoveSequences,
} from './move-generator.js';
import { createDiceRoll } from './dice.js';
import { toCanonical } from './board-utils.js';

// ── Test Helpers ────────────────────────────────────────────────────

function makeChecker(
  owner: PlayerId,
  index: number,
  position: CheckerState['position'] = { zone: 'reserve' },
): CheckerState {
  return {
    id: `${owner}-${index}`,
    owner,
    position,
    isLocked: false,
  };
}

function makeEmptyBoard(): PointState[] {
  return Array.from({ length: 24 }, (_, i) => ({
    index: i + 1,
    checkers: [],
  }));
}

function makeState(overrides?: Partial<GameState>): GameState {
  return {
    board: makeEmptyBoard(),
    reserves: { player1: [], player2: [] },
    locked: { player1: [], player2: [] },
    currentPlayer: 'player1',
    dice: null,
    doublingCube: { value: 1, owner: 'center', isOffered: false },
    turnPhase: 'moving',
    gamePhase: 'playing',
    winner: null,
    winType: null,
    ...overrides,
  };
}

/**
 * Place checkers of `owner` on a canonical board point.
 * Returns a new state without mutating.
 */
function placeCheckers(
  state: GameState,
  canonicalPoint: number,
  owner: PlayerId,
  count: number,
  startId = 0,
): GameState {
  const board = state.board.map((pt) => ({ ...pt, checkers: [...pt.checkers] }));
  const point = board[canonicalPoint - 1]!;
  for (let i = 0; i < count; i++) {
    const id = startId + i;
    point.checkers.push(
      makeChecker(owner, id, { zone: 'board', point: canonicalPoint }),
    );
  }
  return { ...state, board };
}

/**
 * Place a single named checker on a canonical board point.
 */
function placeNamedChecker(
  state: GameState,
  canonicalPoint: number,
  checker: CheckerState,
): GameState {
  const board = state.board.map((pt) => ({ ...pt, checkers: [...pt.checkers] }));
  board[canonicalPoint - 1]!.checkers.push({
    ...checker,
    position: { zone: 'board', point: canonicalPoint },
  });
  return { ...state, board };
}

/**
 * Add reserve checkers for a player.
 */
function addReserve(
  state: GameState,
  player: PlayerId,
  count: number,
  startId = 0,
): GameState {
  const checkers: CheckerState[] = [];
  for (let i = 0; i < count; i++) {
    checkers.push(makeChecker(player, startId + i));
  }
  return {
    ...state,
    reserves: {
      ...state.reserves,
      [player]: [...state.reserves[player], ...checkers],
    },
  };
}

// ── generateMovesForDie ─────────────────────────────────────────────

describe('generateMovesForDie', () => {
  it('generates deploy moves when P1 has checkers in reserve', () => {
    let state = makeState();
    state = addReserve(state, 'player1', 3);

    const moves = generateMovesForDie(state, 'player1', 3);

    expect(moves).toHaveLength(1);
    expect(moves[0]!.type).toBe('deploy');
    expect(moves[0]!.dieValue).toBe(3);
    expect(moves[0]!.from).toEqual({ zone: 'reserve' });
    // P1 perspective 3 = canonical 3
    expect(moves[0]!.to).toEqual({ zone: 'board', point: 3 });
  });

  it('generates deploy moves when P2 has checkers in reserve', () => {
    let state = makeState();
    state = addReserve(state, 'player2', 2);

    const moves = generateMovesForDie(state, 'player2', 4);

    expect(moves).toHaveLength(1);
    expect(moves[0]!.type).toBe('deploy');
    expect(moves[0]!.dieValue).toBe(4);
    // P2 perspective 4 = canonical 21
    expect(moves[0]!.to).toEqual({ zone: 'board', point: toCanonical(4, 'player2') });
  });

  it('returns no deploy moves when garrison point is blocked', () => {
    let state = makeState();
    state = addReserve(state, 'player1', 1);
    // Block canonical point 3 with 2 opponent checkers
    state = placeCheckers(state, 3, 'player2', 2);

    const moves = generateMovesForDie(state, 'player1', 3);

    expect(moves).toHaveLength(0);
  });

  it('generates deploy with hit when garrison point has a blot', () => {
    let state = makeState();
    state = addReserve(state, 'player1', 1);
    // Place a single P2 checker (blot) on canonical 5
    const blot = makeChecker('player2', 50, { zone: 'board', point: 5 });
    state = placeNamedChecker(state, 5, blot);

    const moves = generateMovesForDie(state, 'player1', 5);

    expect(moves).toHaveLength(1);
    expect(moves[0]!.type).toBe('deploy');
    expect(moves[0]!.hits).toBe('player2-50');
  });

  it('generates advance moves when no reserve (board checkers only)', () => {
    let state = makeState();
    // Place P1 checkers on canonical points 5 and 10
    const c1 = makeChecker('player1', 1, { zone: 'board', point: 5 });
    state = placeNamedChecker(state, 5, c1);
    const c2 = makeChecker('player1', 2, { zone: 'board', point: 10 });
    state = placeNamedChecker(state, 10, c2);

    const moves = generateMovesForDie(state, 'player1', 3);

    expect(moves).toHaveLength(2);
    expect(moves.every((m) => m.type === 'advance')).toBe(true);
    // Both should use die value 3
    expect(moves.every((m) => m.dieValue === 3)).toBe(true);
  });

  it('generates advance moves with hit detection', () => {
    let state = makeState();
    // P1 at canonical 5
    const attacker = makeChecker('player1', 1, { zone: 'board', point: 5 });
    state = placeNamedChecker(state, 5, attacker);
    // P2 blot at canonical 8 (P1 perspective 5 + 3 = 8)
    const blot = makeChecker('player2', 50, { zone: 'board', point: 8 });
    state = placeNamedChecker(state, 8, blot);

    const moves = generateMovesForDie(state, 'player1', 3);

    expect(moves).toHaveLength(1);
    expect(moves[0]!.hits).toBe('player2-50');
    expect(moves[0]!.to).toEqual({ zone: 'board', point: 8 });
  });

  it('generates lock move when advance enters siege zone', () => {
    let state = makeState();
    // P1 at canonical 16 (perspective 16), advance by 4 => perspective 20 => siege zone => lock
    const checker = makeChecker('player1', 1, { zone: 'board', point: 16 });
    state = placeNamedChecker(state, 16, checker);

    const moves = generateMovesForDie(state, 'player1', 4);

    expect(moves).toHaveLength(1);
    expect(moves[0]!.to).toEqual({ zone: 'locked' });
    expect(moves[0]!.type).toBe('advance');
  });

  it('generates lock move for overshoot in siege zone', () => {
    let state = makeState();
    // P1 at canonical 22 (perspective 22), advance by 6 => perspective 28 => overshoot => lock
    const checker = makeChecker('player1', 1, { zone: 'board', point: 22 });
    state = placeNamedChecker(state, 22, checker);

    const moves = generateMovesForDie(state, 'player1', 6);

    expect(moves).toHaveLength(1);
    expect(moves[0]!.to).toEqual({ zone: 'locked' });
  });

  it('returns no moves when all target points are blocked', () => {
    let state = makeState();
    // P1 at canonical 5
    const checker = makeChecker('player1', 1, { zone: 'board', point: 5 });
    state = placeNamedChecker(state, 5, checker);
    // Block canonical 8 (perspective 5 + 3 = 8 for P1)
    state = placeCheckers(state, 8, 'player2', 2, 50);

    const moves = generateMovesForDie(state, 'player1', 3);

    expect(moves).toHaveLength(0);
  });

  it('only generates deploy moves (not advance) when reserve has checkers', () => {
    let state = makeState();
    state = addReserve(state, 'player1', 1);
    // Also place a board checker
    const boardChecker = makeChecker('player1', 99, { zone: 'board', point: 10 });
    state = placeNamedChecker(state, 10, boardChecker);

    const moves = generateMovesForDie(state, 'player1', 3);

    // Should only see the deploy move, not the advance move
    expect(moves.every((m) => m.type === 'deploy')).toBe(true);
  });
});

// ── generateAllLegalMoves ───────────────────────────────────────────

describe('generateAllLegalMoves', () => {
  it('returns moves for both die values (non-doubles)', () => {
    let state = makeState();
    const c1 = makeChecker('player1', 1, { zone: 'board', point: 5 });
    state = placeNamedChecker(state, 5, c1);

    const dice = createDiceRoll(3, 5);
    const moves = generateAllLegalMoves(state, 'player1', dice);

    // Checker at canonical 5: advance by 3 -> canonical 8, advance by 5 -> canonical 10
    expect(moves).toHaveLength(2);
    const dieValues = moves.map((m) => m.dieValue).sort();
    expect(dieValues).toEqual([3, 5]);
  });

  it('deduplicates when doubles (only unique die values checked)', () => {
    let state = makeState();
    const c1 = makeChecker('player1', 1, { zone: 'board', point: 5 });
    state = placeNamedChecker(state, 5, c1);

    const dice = createDiceRoll(4, 4);
    const moves = generateAllLegalMoves(state, 'player1', dice);

    // Should only return one move (advance by 4), not four
    expect(moves).toHaveLength(1);
    expect(moves[0]!.dieValue).toBe(4);
  });

  it('returns empty when no legal moves exist', () => {
    let state = makeState();
    // P1 checker at canonical 5, block both destinations
    const c1 = makeChecker('player1', 1, { zone: 'board', point: 5 });
    state = placeNamedChecker(state, 5, c1);
    state = placeCheckers(state, 8, 'player2', 2, 50);  // blocks die=3
    state = placeCheckers(state, 10, 'player2', 2, 60); // blocks die=5

    const dice = createDiceRoll(3, 5);
    const moves = generateAllLegalMoves(state, 'player1', dice);

    expect(moves).toHaveLength(0);
  });

  it('returns deploy moves when reserve has checkers, ignoring board checkers', () => {
    let state = makeState();
    state = addReserve(state, 'player1', 1);
    const boardChecker = makeChecker('player1', 99, { zone: 'board', point: 10 });
    state = placeNamedChecker(state, 10, boardChecker);

    const dice = createDiceRoll(3, 5);
    const moves = generateAllLegalMoves(state, 'player1', dice);

    // Deploy to canonical 3 (die=3) and canonical 5 (die=5)
    expect(moves).toHaveLength(2);
    expect(moves.every((m) => m.type === 'deploy')).toBe(true);
  });

  it('handles partially used dice correctly', () => {
    let state = makeState();
    const c1 = makeChecker('player1', 1, { zone: 'board', point: 5 });
    state = placeNamedChecker(state, 5, c1);

    // Dice [3,5] with die 3 already used
    const dice: DiceRoll = {
      values: [3, 5],
      isDoubles: false,
      movesAvailable: 2,
      movesUsed: 1,
      usedValues: [3],
    };
    const moves = generateAllLegalMoves(state, 'player1', dice);

    // Only die value 5 remains
    expect(moves).toHaveLength(1);
    expect(moves[0]!.dieValue).toBe(5);
  });
});

// ── generateLegalMoveSequences ──────────────────────────────────────

describe('generateLegalMoveSequences', () => {
  it('generates a simple 2-move sequence (both dice used)', () => {
    let state = makeState({ currentPlayer: 'player1' });
    state = addReserve(state, 'player1', 2);

    const dice = createDiceRoll(3, 5);
    const sequences = generateLegalMoveSequences(state, 'player1', dice);

    // Both dice should be usable (deploy to 3 and 5)
    expect(sequences.length).toBeGreaterThanOrEqual(1);
    // Every valid sequence should use 2 dice
    for (const seq of sequences) {
      expect(seq).toHaveLength(2);
    }
  });

  it('returns single-move sequences when only 1 move is possible', () => {
    let state = makeState({ currentPlayer: 'player1' });
    state = addReserve(state, 'player1', 1);
    // Block garrison point 5 so die=5 cannot deploy
    state = placeCheckers(state, 5, 'player2', 2, 50);
    // After deploying with die=3, reserve is empty; the only board checker
    // is at canonical 3. Advance by 5 would go to canonical 8 — which is open.
    // So actually 2 moves are possible. Let's block 8 too.
    state = placeCheckers(state, 8, 'player2', 2, 60);
    // Now: deploy with die=3 is the first move. Then advance 3->8 is blocked (die=5).
    // Die=3 was used already. So only 1 move total.

    const dice = createDiceRoll(3, 5);
    const sequences = generateLegalMoveSequences(state, 'player1', dice);

    // Max dice used should be 1
    expect(sequences.length).toBeGreaterThanOrEqual(1);
    for (const seq of sequences) {
      expect(seq).toHaveLength(1);
    }
  });

  it('obligation: must use maximum dice count', () => {
    let state = makeState({ currentPlayer: 'player1' });
    // Two board checkers, both can move with either die value
    const c1 = makeChecker('player1', 1, { zone: 'board', point: 3 });
    state = placeNamedChecker(state, 3, c1);
    const c2 = makeChecker('player1', 2, { zone: 'board', point: 7 });
    state = placeNamedChecker(state, 7, c2);

    const dice = createDiceRoll(2, 4);
    const sequences = generateLegalMoveSequences(state, 'player1', dice);

    // Both dice should be usable, so all sequences must have length 2
    for (const seq of sequences) {
      expect(seq).toHaveLength(2);
    }
  });

  it('obligation: when only one die can be used, must use the larger', () => {
    let state = makeState({ currentPlayer: 'player1' });
    // P1 checker at canonical 5
    const c1 = makeChecker('player1', 1, { zone: 'board', point: 5 });
    state = placeNamedChecker(state, 5, c1);
    // Block canonical 7 (5+2) so die=2 cannot be used
    state = placeCheckers(state, 7, 'player2', 2, 50);
    // Block canonical 9 (5+4) so die=4 cannot be used? No, we want ONE die usable.
    // Let's set it up: die=2 target (canonical 7) is blocked,
    // die=4 target (canonical 9) is open
    // After using die=4, checker at 9. Remaining die=2 would go to 11.
    // Block canonical 11 so no second move.
    state = placeCheckers(state, 11, 'player2', 2, 60);

    // Also: if we use die=2 first (7 is blocked), that fails. So only die=4 is usable.
    // That matches the scenario: only 1 die usable, must use the larger (4 > 2).

    const dice = createDiceRoll(2, 4);
    const sequences = generateLegalMoveSequences(state, 'player1', dice);

    expect(sequences.length).toBeGreaterThanOrEqual(1);
    for (const seq of sequences) {
      expect(seq).toHaveLength(1);
      expect(seq[0]!.dieValue).toBe(4);
    }
  });

  it('obligation: smaller die filtered when only one usable and larger is usable', () => {
    let state = makeState({ currentPlayer: 'player1' });
    // P1 checker at canonical 10 (perspective 10)
    const c1 = makeChecker('player1', 1, { zone: 'board', point: 10 });
    state = placeNamedChecker(state, 10, c1);

    // Die 1 and 6: both can advance from point 10
    // After die=1 → canonical 11, then die=6 → canonical 17; open => 2 moves.
    // After die=6 → canonical 16, then die=1 → canonical 17; open => 2 moves.
    // Both allow 2 moves, so no single-die filtering needed.
    // Let's block second moves:
    state = placeCheckers(state, 17, 'player2', 2, 50); // blocks 11+6 and 16+1
    state = placeCheckers(state, 12, 'player2', 2, 60); // blocks 11+1 (die=1 then die=1 N/A)
    // After die=1 → 11, remaining die=6 → 17 blocked. 1 move.
    // After die=6 → 16, remaining die=1 → 17 blocked. 1 move.
    // Both usable at 1 move each. Must use larger (6).

    const dice = createDiceRoll(1, 6);
    const sequences = generateLegalMoveSequences(state, 'player1', dice);

    expect(sequences.length).toBeGreaterThanOrEqual(1);
    for (const seq of sequences) {
      expect(seq).toHaveLength(1);
      expect(seq[0]!.dieValue).toBe(6);
    }
  });

  it('doubles: can generate up to 4-move sequences', () => {
    let state = makeState({ currentPlayer: 'player1' });
    state = addReserve(state, 'player1', 4);

    const dice = createDiceRoll(3, 3); // doubles: 4 moves of value 3

    const sequences = generateLegalMoveSequences(state, 'player1', dice);

    expect(sequences.length).toBeGreaterThanOrEqual(1);
    // All sequences should have 4 moves (all dice used)
    for (const seq of sequences) {
      expect(seq).toHaveLength(4);
    }
  });

  it('doubles: maximizes moves used even if less than 4', () => {
    let state = makeState({ currentPlayer: 'player1' });
    state = addReserve(state, 'player1', 2);
    // Only 2 reserve checkers. After deploying both, checkers at canonical 3.
    // They need to advance by 3 again => canonical 6.
    // Block canonical 6 so no more advances after deploy.
    state = placeCheckers(state, 6, 'player2', 2, 50);

    const dice = createDiceRoll(3, 3);

    const sequences = generateLegalMoveSequences(state, 'player1', dice);

    // Max possible is 2 (deploy both), then no more moves
    expect(sequences.length).toBeGreaterThanOrEqual(1);
    for (const seq of sequences) {
      expect(seq).toHaveLength(2);
    }
  });

  it('no moves available returns empty array', () => {
    let state = makeState({ currentPlayer: 'player1' });
    // Single checker, all targets blocked
    const c1 = makeChecker('player1', 1, { zone: 'board', point: 5 });
    state = placeNamedChecker(state, 5, c1);
    state = placeCheckers(state, 8, 'player2', 2, 50); // blocks die=3
    state = placeCheckers(state, 10, 'player2', 2, 60); // blocks die=5

    const dice = createDiceRoll(3, 5);
    const sequences = generateLegalMoveSequences(state, 'player1', dice);

    expect(sequences).toHaveLength(0);
  });

  it('multiple valid sequences (branching)', () => {
    let state = makeState({ currentPlayer: 'player1' });
    // Two checkers, both can move with die=3 and die=5
    const c1 = makeChecker('player1', 1, { zone: 'board', point: 3 });
    state = placeNamedChecker(state, 3, c1);
    const c2 = makeChecker('player1', 2, { zone: 'board', point: 7 });
    state = placeNamedChecker(state, 7, c2);

    const dice = createDiceRoll(2, 4);
    const sequences = generateLegalMoveSequences(state, 'player1', dice);

    // Multiple branching options exist
    expect(sequences.length).toBeGreaterThan(1);
    // All should use both dice
    for (const seq of sequences) {
      expect(seq).toHaveLength(2);
    }
  });

  it('P2 move sequences use correct canonical mapping', () => {
    let state = makeState({ currentPlayer: 'player2' });
    state = addReserve(state, 'player2', 2);

    const dice = createDiceRoll(1, 2);
    const sequences = generateLegalMoveSequences(state, 'player2', dice);

    expect(sequences.length).toBeGreaterThanOrEqual(1);
    for (const seq of sequences) {
      expect(seq).toHaveLength(2);
      // All moves should deploy to P2's garrison (canonical 19-24)
      for (const move of seq) {
        expect(move.type).toBe('deploy');
        const to = move.to as { zone: 'board'; point: number };
        expect(to.point).toBeGreaterThanOrEqual(19);
        expect(to.point).toBeLessThanOrEqual(24);
      }
    }
  });

  it('deploy obligation: must deploy before advancing', () => {
    let state = makeState({ currentPlayer: 'player1' });
    // 1 in reserve, 1 on board
    state = addReserve(state, 'player1', 1, 0);
    const boardChecker = makeChecker('player1', 99, { zone: 'board', point: 10 });
    state = placeNamedChecker(state, 10, boardChecker);

    const dice = createDiceRoll(3, 5);
    const sequences = generateLegalMoveSequences(state, 'player1', dice);

    expect(sequences.length).toBeGreaterThanOrEqual(1);
    // First move in every sequence must be a deploy
    for (const seq of sequences) {
      expect(seq[0]!.type).toBe('deploy');
    }
  });

  it('sequences contain proper Move objects with all fields', () => {
    let state = makeState({ currentPlayer: 'player1' });
    state = addReserve(state, 'player1', 2);

    const dice = createDiceRoll(2, 5);
    const sequences = generateLegalMoveSequences(state, 'player1', dice);

    expect(sequences.length).toBeGreaterThanOrEqual(1);
    for (const seq of sequences) {
      for (const move of seq) {
        expect(move).toHaveProperty('type');
        expect(move).toHaveProperty('checkerId');
        expect(move).toHaveProperty('from');
        expect(move).toHaveProperty('to');
        expect(move).toHaveProperty('dieValue');
        expect(typeof move.checkerId).toBe('string');
        expect(typeof move.dieValue).toBe('number');
      }
    }
  });

  it('does not return duplicate sequences', () => {
    let state = makeState({ currentPlayer: 'player1' });
    const c1 = makeChecker('player1', 1, { zone: 'board', point: 5 });
    state = placeNamedChecker(state, 5, c1);

    const dice = createDiceRoll(2, 4);
    const sequences = generateLegalMoveSequences(state, 'player1', dice);

    // Serialize sequences to check uniqueness
    const serialized = sequences.map((seq) => JSON.stringify(seq));
    const uniqueSerialized = [...new Set(serialized)];
    expect(serialized).toHaveLength(uniqueSerialized.length);
  });

  it('advance into siege zone produces lock in sequence', () => {
    let state = makeState({ currentPlayer: 'player1' });
    // Checker at canonical 16 (perspective 16), die=5 => perspective 21 => siege zone => lock
    const c1 = makeChecker('player1', 1, { zone: 'board', point: 16 });
    state = placeNamedChecker(state, 16, c1);

    const dice = createDiceRoll(5, 2);
    const sequences = generateLegalMoveSequences(state, 'player1', dice);

    // Should have at least a sequence where die=5 locks the checker
    const lockSequences = sequences.filter((seq) =>
      seq.some((m) => m.to.zone === 'locked'),
    );
    expect(lockSequences.length).toBeGreaterThanOrEqual(1);
  });

  it('handles state where all dice are already used', () => {
    const state = makeState({ currentPlayer: 'player1' });
    const dice: DiceRoll = {
      values: [3, 5],
      isDoubles: false,
      movesAvailable: 2,
      movesUsed: 2,
      usedValues: [3, 5],
    };

    const sequences = generateLegalMoveSequences(state, 'player1', dice);

    expect(sequences).toHaveLength(0);
  });
});
