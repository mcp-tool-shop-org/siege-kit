import { describe, it, expect } from 'vitest';
import type {
  GameState,
  PlayerId,
  CheckerState,
  PointState,
  Move,
} from '@mcp-tool-shop/siege-types';

import {
  isLegalLanding,
  isLegalDeploy,
  isLegalAdvance,
  isLegalOvershoot,
  validateMove,
} from './move-validator.js';
import { toCanonical } from './board-utils.js';

// ── Test Helpers ────────────────────────────────────────────────────

function makeChecker(
  owner: PlayerId,
  index: number,
  position: CheckerState['position'] = { zone: 'reserve' },
  isLocked = false,
): CheckerState {
  return {
    id: `${owner}-${index}`,
    owner,
    position,
    isLocked,
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
 * Place `count` checkers of `owner` on `canonicalPoint`.
 * Returns new state without mutating the original.
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
    point.checkers.push(
      makeChecker(owner, startId + i + 100 * canonicalPoint, {
        zone: 'board',
        point: canonicalPoint,
      }),
    );
  }
  return { ...state, board };
}

/**
 * Place a single named checker on the board.
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
): GameState {
  const checkers: CheckerState[] = [];
  for (let i = 0; i < count; i++) {
    checkers.push(makeChecker(player, 900 + i));
  }
  return {
    ...state,
    reserves: {
      ...state.reserves,
      [player]: [...state.reserves[player], ...checkers],
    },
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('isLegalLanding', () => {
  it('legal on empty point', () => {
    const state = makeState();
    expect(isLegalLanding(state, 10, 'player1')).toBe(true);
  });

  it('legal on point with friendly checkers', () => {
    let state = makeState();
    state = placeCheckers(state, 10, 'player1', 3);
    expect(isLegalLanding(state, 10, 'player1')).toBe(true);
  });

  it('legal on blot (single opponent checker)', () => {
    let state = makeState();
    state = placeCheckers(state, 10, 'player2', 1);
    expect(isLegalLanding(state, 10, 'player1')).toBe(true);
  });

  it('illegal on fortified point (2+ opponent checkers)', () => {
    let state = makeState();
    state = placeCheckers(state, 10, 'player2', 2);
    expect(isLegalLanding(state, 10, 'player1')).toBe(false);
  });

  it('illegal on 3 opponent checkers', () => {
    let state = makeState();
    state = placeCheckers(state, 10, 'player2', 3);
    expect(isLegalLanding(state, 10, 'player1')).toBe(false);
  });

  it('illegal for out-of-range point', () => {
    const state = makeState();
    expect(isLegalLanding(state, 0, 'player1')).toBe(false);
    expect(isLegalLanding(state, 25, 'player1')).toBe(false);
  });
});

describe('isLegalDeploy', () => {
  it('legal deploy to each garrison point (P1, die 1-6)', () => {
    for (let die = 1; die <= 6; die++) {
      let state = makeState();
      state = addReserve(state, 'player1', 1);
      expect(isLegalDeploy(state, 'player1', die)).toBe(true);
    }
  });

  it('legal deploy for P2 (die maps to canonical garrison 19-24)', () => {
    for (let die = 1; die <= 6; die++) {
      let state = makeState();
      state = addReserve(state, 'player2', 1);
      // P2 perspective 1-6 = canonical 24-19
      expect(isLegalDeploy(state, 'player2', die)).toBe(true);
    }
  });

  it('illegal deploy when garrison point is blocked', () => {
    let state = makeState();
    state = addReserve(state, 'player1', 1);
    // Block canonical point 3 (P1 die=3, perspective=3, canonical=3)
    state = placeCheckers(state, 3, 'player2', 2);
    expect(isLegalDeploy(state, 'player1', 3)).toBe(false);
  });

  it('legal deploy to a blot (single opponent on garrison point)', () => {
    let state = makeState();
    state = addReserve(state, 'player1', 1);
    state = placeCheckers(state, 4, 'player2', 1);
    expect(isLegalDeploy(state, 'player1', 4)).toBe(true);
  });

  it('illegal deploy with no reserve checkers', () => {
    const state = makeState(); // empty reserves
    expect(isLegalDeploy(state, 'player1', 3)).toBe(false);
  });

  it('illegal deploy with die value out of range', () => {
    let state = makeState();
    state = addReserve(state, 'player1', 1);
    expect(isLegalDeploy(state, 'player1', 0)).toBe(false);
    expect(isLegalDeploy(state, 'player1', 7)).toBe(false);
  });

  it('P2 deploy blocked at canonical garrison point', () => {
    let state = makeState();
    state = addReserve(state, 'player2', 1);
    // P2 die=2 -> perspective 2 -> canonical 23
    const canonical = toCanonical(2, 'player2'); // 23
    state = placeCheckers(state, canonical, 'player1', 2);
    expect(isLegalDeploy(state, 'player2', 2)).toBe(false);
  });
});

describe('isLegalAdvance', () => {
  it('legal advance to an open point (P1)', () => {
    let state = makeState();
    // P1 checker at canonical 5 (perspective 5), advance by 3 -> perspective 8 = canonical 8
    const checker = makeChecker('player1', 1, { zone: 'board', point: 5 });
    state = placeNamedChecker(state, 5, checker);
    expect(isLegalAdvance(state, 'player1-1', 3, 'player1')).toBe(true);
  });

  it('illegal advance to a blocked point', () => {
    let state = makeState();
    const checker = makeChecker('player1', 1, { zone: 'board', point: 5 });
    state = placeNamedChecker(state, 5, checker);
    // Block canonical 8 with 2 opponent checkers
    state = placeCheckers(state, 8, 'player2', 2);
    expect(isLegalAdvance(state, 'player1-1', 3, 'player1')).toBe(false);
  });

  it('legal advance onto a blot (hit)', () => {
    let state = makeState();
    const checker = makeChecker('player1', 1, { zone: 'board', point: 5 });
    state = placeNamedChecker(state, 5, checker);
    state = placeCheckers(state, 8, 'player2', 1); // blot
    expect(isLegalAdvance(state, 'player1-1', 3, 'player1')).toBe(true);
  });

  it('legal advance into Siege Zone (P1: canonical 19-24)', () => {
    let state = makeState();
    // P1 at canonical 16 (perspective 16), advance by 4 -> perspective 20 -> enters siege zone
    const checker = makeChecker('player1', 1, { zone: 'board', point: 16 });
    state = placeNamedChecker(state, 16, checker);
    expect(isLegalAdvance(state, 'player1-1', 4, 'player1')).toBe(true);
  });

  it('legal advance into Siege Zone (P2)', () => {
    let state = makeState();
    // P2 at canonical 10 (perspective 25-10=15), advance by 5 -> perspective 20 -> siege zone
    // Canonical for perspective 20 (P2) = 25 - 20 = 5
    const checker = makeChecker('player2', 1, { zone: 'board', point: 10 });
    state = placeNamedChecker(state, 10, checker);
    expect(isLegalAdvance(state, 'player2-1', 5, 'player2')).toBe(true);
  });

  it('illegal advance for checker not on board', () => {
    const state = makeState();
    // Checker is in reserve, not on board
    expect(isLegalAdvance(state, 'player1-1', 3, 'player1')).toBe(false);
  });

  it('illegal advance for non-existent checker', () => {
    const state = makeState();
    expect(isLegalAdvance(state, 'nonexistent', 3, 'player1')).toBe(false);
  });

  it('P2 advance: canonical mapping is correct', () => {
    let state = makeState();
    // P2 at canonical 20 (perspective 25-20=5), advance by 6 -> perspective 11
    // canonical for perspective 11 (P2) = 25-11 = 14
    const checker = makeChecker('player2', 1, { zone: 'board', point: 20 });
    state = placeNamedChecker(state, 20, checker);
    expect(isLegalAdvance(state, 'player2-1', 6, 'player2')).toBe(true);
  });
});

describe('isLegalOvershoot', () => {
  it('legal when checker is at the highest occupied siege point', () => {
    let state = makeState();
    // P1 checker at canonical 22 (perspective 22), only checker in siege zone
    state = placeCheckers(state, 22, 'player1', 1);
    expect(isLegalOvershoot(state, 22, 6, 'player1')).toBe(true);
  });

  it('illegal when higher friendly checker exists in siege zone', () => {
    let state = makeState();
    // P1: checker at canonical 20 (perspective 20), another at canonical 23 (perspective 23)
    state = placeCheckers(state, 20, 'player1', 1);
    state = placeCheckers(state, 23, 'player1', 1);
    // Try to overshoot from 20 -- not highest
    expect(isLegalOvershoot(state, 20, 6, 'player1')).toBe(false);
  });

  it('legal when checker IS the highest and others are lower', () => {
    let state = makeState();
    // P1: canonical 20 (perspective 20) and canonical 23 (perspective 23)
    state = placeCheckers(state, 20, 'player1', 1);
    state = placeCheckers(state, 23, 'player1', 1);
    // Overshoot from 23 -- is the highest -> legal
    expect(isLegalOvershoot(state, 23, 6, 'player1')).toBe(true);
  });

  it('illegal when checker is not in siege zone', () => {
    let state = makeState();
    state = placeCheckers(state, 10, 'player1', 1);
    expect(isLegalOvershoot(state, 10, 6, 'player1')).toBe(false);
  });

  it('P2 overshoot: canonical 3 (perspective 22) is legal when highest', () => {
    let state = makeState();
    // P2 siege zone: canonical 1-6
    // canonical 3 = perspective 22, canonical 5 = perspective 20
    state = placeCheckers(state, 3, 'player2', 1);
    state = placeCheckers(state, 5, 'player2', 1);
    // canonical 3 (perspective 22) is highest -> legal
    expect(isLegalOvershoot(state, 3, 6, 'player2')).toBe(true);
    // canonical 5 (perspective 20) is NOT highest -> illegal
    expect(isLegalOvershoot(state, 5, 6, 'player2')).toBe(false);
  });
});

describe('validateMove', () => {
  describe('deploy moves', () => {
    it('valid deploy move', () => {
      let state = makeState();
      state = addReserve(state, 'player1', 1);
      const reserveChecker = state.reserves.player1[0]!;

      const move: Move = {
        type: 'deploy',
        checkerId: reserveChecker.id,
        from: { zone: 'reserve' },
        to: { zone: 'board', point: 3 }, // die=3, P1 canonical=3
        dieValue: 3,
      };

      expect(validateMove(state, move, 'player1')).toEqual({ valid: true });
    });

    it('invalid deploy: checker not in reserve', () => {
      const state = makeState();
      const move: Move = {
        type: 'deploy',
        checkerId: 'nonexistent',
        from: { zone: 'reserve' },
        to: { zone: 'board', point: 3 },
        dieValue: 3,
      };

      const result = validateMove(state, move, 'player1');
      expect(result.valid).toBe(false);
    });

    it('invalid deploy: wrong from zone', () => {
      let state = makeState();
      state = addReserve(state, 'player1', 1);
      const move: Move = {
        type: 'deploy',
        checkerId: state.reserves.player1[0]!.id,
        from: { zone: 'board', point: 5 },
        to: { zone: 'board', point: 3 },
        dieValue: 3,
      };

      const result = validateMove(state, move, 'player1');
      expect(result.valid).toBe(false);
      expect((result as { valid: false; reason: string }).reason).toContain('reserve');
    });

    it('invalid deploy: target blocked', () => {
      let state = makeState();
      state = addReserve(state, 'player1', 1);
      state = placeCheckers(state, 3, 'player2', 2);

      const move: Move = {
        type: 'deploy',
        checkerId: state.reserves.player1[0]!.id,
        from: { zone: 'reserve' },
        to: { zone: 'board', point: 3 },
        dieValue: 3,
      };

      const result = validateMove(state, move, 'player1');
      expect(result.valid).toBe(false);
    });

    it('invalid deploy: wrong target point', () => {
      let state = makeState();
      state = addReserve(state, 'player1', 1);

      const move: Move = {
        type: 'deploy',
        checkerId: state.reserves.player1[0]!.id,
        from: { zone: 'reserve' },
        to: { zone: 'board', point: 7 }, // die=3 should go to canonical 3, not 7
        dieValue: 3,
      };

      const result = validateMove(state, move, 'player1');
      expect(result.valid).toBe(false);
    });

    it('valid deploy with hit', () => {
      let state = makeState();
      state = addReserve(state, 'player1', 1);
      // Place a P2 blot at canonical 3
      const blotChecker = makeChecker('player2', 50, { zone: 'board', point: 3 });
      state = placeNamedChecker(state, 3, blotChecker);

      const move: Move = {
        type: 'deploy',
        checkerId: state.reserves.player1[0]!.id,
        from: { zone: 'reserve' },
        to: { zone: 'board', point: 3 },
        dieValue: 3,
        hits: 'player2-50',
      };

      expect(validateMove(state, move, 'player1')).toEqual({ valid: true });
    });

    it('invalid deploy: claims hit on empty point', () => {
      let state = makeState();
      state = addReserve(state, 'player1', 1);

      const move: Move = {
        type: 'deploy',
        checkerId: state.reserves.player1[0]!.id,
        from: { zone: 'reserve' },
        to: { zone: 'board', point: 3 },
        dieValue: 3,
        hits: 'player2-50',
      };

      const result = validateMove(state, move, 'player1');
      expect(result.valid).toBe(false);
    });

    it('P2 valid deploy', () => {
      let state = makeState();
      state = addReserve(state, 'player2', 1);
      // P2 die=4, perspective 4 = canonical 21
      const move: Move = {
        type: 'deploy',
        checkerId: state.reserves.player2[0]!.id,
        from: { zone: 'reserve' },
        to: { zone: 'board', point: 21 },
        dieValue: 4,
      };

      expect(validateMove(state, move, 'player2')).toEqual({ valid: true });
    });
  });

  describe('advance moves', () => {
    it('valid advance to open point', () => {
      let state = makeState();
      const checker = makeChecker('player1', 1, { zone: 'board', point: 5 });
      state = placeNamedChecker(state, 5, checker);

      const move: Move = {
        type: 'advance',
        checkerId: 'player1-1',
        from: { zone: 'board', point: 5 },
        to: { zone: 'board', point: 8 },
        dieValue: 3,
      };

      expect(validateMove(state, move, 'player1')).toEqual({ valid: true });
    });

    it('invalid advance: target blocked', () => {
      let state = makeState();
      const checker = makeChecker('player1', 1, { zone: 'board', point: 5 });
      state = placeNamedChecker(state, 5, checker);
      state = placeCheckers(state, 8, 'player2', 2);

      const move: Move = {
        type: 'advance',
        checkerId: 'player1-1',
        from: { zone: 'board', point: 5 },
        to: { zone: 'board', point: 8 },
        dieValue: 3,
      };

      const result = validateMove(state, move, 'player1');
      expect(result.valid).toBe(false);
    });

    it('valid advance into siege zone results in lock', () => {
      let state = makeState();
      // P1 at canonical 17 (perspective 17), advance 3 -> perspective 20 -> siege zone -> lock
      const checker = makeChecker('player1', 1, { zone: 'board', point: 17 });
      state = placeNamedChecker(state, 17, checker);

      const move: Move = {
        type: 'advance',
        checkerId: 'player1-1',
        from: { zone: 'board', point: 17 },
        to: { zone: 'locked' },
        dieValue: 3,
      };

      expect(validateMove(state, move, 'player1')).toEqual({ valid: true });
    });

    it('invalid advance into siege zone: to is not locked', () => {
      let state = makeState();
      const checker = makeChecker('player1', 1, { zone: 'board', point: 17 });
      state = placeNamedChecker(state, 17, checker);

      const move: Move = {
        type: 'advance',
        checkerId: 'player1-1',
        from: { zone: 'board', point: 17 },
        to: { zone: 'board', point: 20 }, // should be 'locked'
        dieValue: 3,
      };

      const result = validateMove(state, move, 'player1');
      expect(result.valid).toBe(false);
    });

    it('valid overshoot from highest siege point', () => {
      let state = makeState();
      // P1 at canonical 22 (perspective 22), advance 6 -> perspective 28 (overshoot)
      const checker = makeChecker('player1', 1, { zone: 'board', point: 22 });
      state = placeNamedChecker(state, 22, checker);

      const move: Move = {
        type: 'advance',
        checkerId: 'player1-1',
        from: { zone: 'board', point: 22 },
        to: { zone: 'locked' },
        dieValue: 6,
      };

      expect(validateMove(state, move, 'player1')).toEqual({ valid: true });
    });

    it('invalid overshoot: not at highest siege point', () => {
      let state = makeState();
      // P1 at canonical 20 and 23
      const c1 = makeChecker('player1', 1, { zone: 'board', point: 20 });
      state = placeNamedChecker(state, 20, c1);
      state = placeCheckers(state, 23, 'player1', 1);

      const move: Move = {
        type: 'advance',
        checkerId: 'player1-1',
        from: { zone: 'board', point: 20 },
        to: { zone: 'locked' },
        dieValue: 6,
      };

      const result = validateMove(state, move, 'player1');
      expect(result.valid).toBe(false);
    });

    it('invalid advance: wrong from zone', () => {
      const state = makeState();

      const move: Move = {
        type: 'advance',
        checkerId: 'player1-1',
        from: { zone: 'reserve' },
        to: { zone: 'board', point: 8 },
        dieValue: 3,
      };

      const result = validateMove(state, move, 'player1');
      expect(result.valid).toBe(false);
      expect((result as { valid: false; reason: string }).reason).toContain('board');
    });

    it('valid advance with hit on blot', () => {
      let state = makeState();
      const checker = makeChecker('player1', 1, { zone: 'board', point: 5 });
      state = placeNamedChecker(state, 5, checker);
      const blot = makeChecker('player2', 50, { zone: 'board', point: 8 });
      state = placeNamedChecker(state, 8, blot);

      const move: Move = {
        type: 'advance',
        checkerId: 'player1-1',
        from: { zone: 'board', point: 5 },
        to: { zone: 'board', point: 8 },
        dieValue: 3,
        hits: 'player2-50',
      };

      expect(validateMove(state, move, 'player1')).toEqual({ valid: true });
    });

    it('invalid advance: wrong target point', () => {
      let state = makeState();
      const checker = makeChecker('player1', 1, { zone: 'board', point: 5 });
      state = placeNamedChecker(state, 5, checker);

      const move: Move = {
        type: 'advance',
        checkerId: 'player1-1',
        from: { zone: 'board', point: 5 },
        to: { zone: 'board', point: 9 }, // should be 8 for die=3
        dieValue: 3,
      };

      const result = validateMove(state, move, 'player1');
      expect(result.valid).toBe(false);
    });
  });

  describe('P2 advance moves', () => {
    it('P2 valid advance (canonical mapping)', () => {
      let state = makeState();
      // P2 at canonical 20 (perspective = 25-20 = 5), advance 4 -> perspective 9
      // canonical for perspective 9 (P2) = 25 - 9 = 16
      const checker = makeChecker('player2', 1, { zone: 'board', point: 20 });
      state = placeNamedChecker(state, 20, checker);

      const move: Move = {
        type: 'advance',
        checkerId: 'player2-1',
        from: { zone: 'board', point: 20 },
        to: { zone: 'board', point: 16 },
        dieValue: 4,
      };

      expect(validateMove(state, move, 'player2')).toEqual({ valid: true });
    });

    it('P2 advance into siege zone (canonical 1-6) results in lock', () => {
      let state = makeState();
      // P2 at canonical 10 (perspective 15), advance 5 -> perspective 20 -> siege zone
      const checker = makeChecker('player2', 1, { zone: 'board', point: 10 });
      state = placeNamedChecker(state, 10, checker);

      const move: Move = {
        type: 'advance',
        checkerId: 'player2-1',
        from: { zone: 'board', point: 10 },
        to: { zone: 'locked' },
        dieValue: 5,
      };

      expect(validateMove(state, move, 'player2')).toEqual({ valid: true });
    });
  });
});
