import { describe, it, expect } from 'vitest';
import type {
  GameState,
  PlayerId,
  CheckerState,
  PointState,
} from '@mcp-tool-shop/siege-types';

import {
  toCanonical,
  toPerspective,
  opponent,
  getPoint,
  getCheckersAt,
  isPointEmpty,
  isPointBlot,
  isPointFortified,
  isPointBlocked,
  isInSiegeZone,
  isInGarrison,
  getReserveCount,
  getLockedCount,
  getBoardCheckers,
  getHighestOccupiedSiegePoint,
} from './board-utils.js';

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
    turnPhase: 'pre-roll',
    gamePhase: 'playing',
    winner: null,
    winType: null,
    ...overrides,
  };
}

/**
 * Returns a new GameState with `count` checkers of `owner` placed on `canonicalPoint`.
 */
function placeCheckers(
  state: GameState,
  canonicalPoint: number,
  owner: PlayerId,
  count: number,
): GameState {
  const board = state.board.map((pt) => ({ ...pt, checkers: [...pt.checkers] }));
  const point = board[canonicalPoint - 1]!;
  const startId = point.checkers.length;
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

// ── Tests ───────────────────────────────────────────────────────────

describe('toCanonical / toPerspective', () => {
  it('P1: identity — canonical equals perspective', () => {
    for (let p = 1; p <= 24; p++) {
      expect(toCanonical(p, 'player1')).toBe(p);
      expect(toPerspective(p, 'player1')).toBe(p);
    }
  });

  it('P2: flip — canonical = 25 - perspective', () => {
    expect(toCanonical(1, 'player2')).toBe(24);
    expect(toCanonical(24, 'player2')).toBe(1);
    expect(toCanonical(5, 'player2')).toBe(20);
    expect(toCanonical(20, 'player2')).toBe(5);
    expect(toCanonical(12, 'player2')).toBe(13);
    expect(toCanonical(13, 'player2')).toBe(12);
  });

  it('P2: toPerspective mirrors toCanonical', () => {
    expect(toPerspective(24, 'player2')).toBe(1);
    expect(toPerspective(1, 'player2')).toBe(24);
    expect(toPerspective(20, 'player2')).toBe(5);
  });

  it('round-trip: toPerspective(toCanonical(x, p), p) === x', () => {
    for (const player of ['player1', 'player2'] as PlayerId[]) {
      for (let x = 1; x <= 24; x++) {
        expect(toPerspective(toCanonical(x, player), player)).toBe(x);
      }
    }
  });

  it('round-trip: toCanonical(toPerspective(x, p), p) === x', () => {
    for (const player of ['player1', 'player2'] as PlayerId[]) {
      for (let x = 1; x <= 24; x++) {
        expect(toCanonical(toPerspective(x, player), player)).toBe(x);
      }
    }
  });
});

describe('opponent', () => {
  it('returns player2 for player1', () => {
    expect(opponent('player1')).toBe('player2');
  });

  it('returns player1 for player2', () => {
    expect(opponent('player2')).toBe('player1');
  });
});

describe('point queries', () => {
  it('getPoint returns the correct PointState', () => {
    const state = makeState();
    const pt = getPoint(state, 5);
    expect(pt.index).toBe(5);
    expect(pt.checkers).toEqual([]);
  });

  it('getCheckersAt returns checkers on a point', () => {
    let state = makeState();
    state = placeCheckers(state, 10, 'player1', 3);
    const checkers = getCheckersAt(state, 10);
    expect(checkers).toHaveLength(3);
    expect(checkers.every((c) => c.owner === 'player1')).toBe(true);
  });

  describe('isPointEmpty', () => {
    it('returns true for empty point', () => {
      const state = makeState();
      expect(isPointEmpty(state, 1)).toBe(true);
    });

    it('returns false for occupied point', () => {
      let state = makeState();
      state = placeCheckers(state, 1, 'player1', 1);
      expect(isPointEmpty(state, 1)).toBe(false);
    });
  });

  describe('isPointBlot', () => {
    it('returns true when single opponent checker present', () => {
      let state = makeState();
      state = placeCheckers(state, 5, 'player2', 1);
      expect(isPointBlot(state, 5, 'player1')).toBe(true);
    });

    it('returns false when single friendly checker present', () => {
      let state = makeState();
      state = placeCheckers(state, 5, 'player1', 1);
      expect(isPointBlot(state, 5, 'player1')).toBe(false);
    });

    it('returns false when two opponent checkers present', () => {
      let state = makeState();
      state = placeCheckers(state, 5, 'player2', 2);
      expect(isPointBlot(state, 5, 'player1')).toBe(false);
    });

    it('returns false for empty point', () => {
      const state = makeState();
      expect(isPointBlot(state, 5, 'player1')).toBe(false);
    });
  });

  describe('isPointFortified', () => {
    it('returns true for 2+ checkers of the specified player', () => {
      let state = makeState();
      state = placeCheckers(state, 7, 'player1', 3);
      expect(isPointFortified(state, 7, 'player1')).toBe(true);
    });

    it('returns true for exactly 2 checkers of the specified player', () => {
      let state = makeState();
      state = placeCheckers(state, 7, 'player1', 2);
      expect(isPointFortified(state, 7, 'player1')).toBe(true);
    });

    it('returns false for single checker', () => {
      let state = makeState();
      state = placeCheckers(state, 7, 'player1', 1);
      expect(isPointFortified(state, 7, 'player1')).toBe(false);
    });

    it('returns false for opponent checkers', () => {
      let state = makeState();
      state = placeCheckers(state, 7, 'player2', 3);
      expect(isPointFortified(state, 7, 'player1')).toBe(false);
    });

    it('returns false for empty point', () => {
      const state = makeState();
      expect(isPointFortified(state, 7, 'player1')).toBe(false);
    });
  });

  describe('isPointBlocked', () => {
    it('returns true when 2+ opponent checkers occupy the point', () => {
      let state = makeState();
      state = placeCheckers(state, 8, 'player2', 2);
      expect(isPointBlocked(state, 8, 'player1')).toBe(true);
    });

    it('returns true when 3 opponent checkers occupy the point', () => {
      let state = makeState();
      state = placeCheckers(state, 8, 'player2', 3);
      expect(isPointBlocked(state, 8, 'player1')).toBe(true);
    });

    it('returns false for a blot (single opponent)', () => {
      let state = makeState();
      state = placeCheckers(state, 8, 'player2', 1);
      expect(isPointBlocked(state, 8, 'player1')).toBe(false);
    });

    it('returns false for friendly checkers', () => {
      let state = makeState();
      state = placeCheckers(state, 8, 'player1', 5);
      expect(isPointBlocked(state, 8, 'player1')).toBe(false);
    });

    it('returns false for empty point', () => {
      const state = makeState();
      expect(isPointBlocked(state, 8, 'player1')).toBe(false);
    });
  });
});

describe('zone queries', () => {
  describe('isInSiegeZone', () => {
    it('P1: canonical 19-24 are in Siege Zone', () => {
      for (let p = 19; p <= 24; p++) {
        expect(isInSiegeZone(p, 'player1')).toBe(true);
      }
    });

    it('P1: canonical 1-18 are NOT in Siege Zone', () => {
      for (let p = 1; p <= 18; p++) {
        expect(isInSiegeZone(p, 'player1')).toBe(false);
      }
    });

    it('P2: canonical 1-6 are in Siege Zone', () => {
      for (let p = 1; p <= 6; p++) {
        expect(isInSiegeZone(p, 'player2')).toBe(true);
      }
    });

    it('P2: canonical 7-24 are NOT in Siege Zone', () => {
      for (let p = 7; p <= 24; p++) {
        expect(isInSiegeZone(p, 'player2')).toBe(false);
      }
    });
  });

  describe('isInGarrison', () => {
    it('P1: canonical 1-6 are in Garrison', () => {
      for (let p = 1; p <= 6; p++) {
        expect(isInGarrison(p, 'player1')).toBe(true);
      }
    });

    it('P1: canonical 7-24 are NOT in Garrison', () => {
      for (let p = 7; p <= 24; p++) {
        expect(isInGarrison(p, 'player1')).toBe(false);
      }
    });

    it('P2: canonical 19-24 are in Garrison', () => {
      for (let p = 19; p <= 24; p++) {
        expect(isInGarrison(p, 'player2')).toBe(true);
      }
    });

    it('P2: canonical 1-18 are NOT in Garrison', () => {
      for (let p = 1; p <= 18; p++) {
        expect(isInGarrison(p, 'player2')).toBe(false);
      }
    });
  });
});

describe('aggregate queries', () => {
  describe('getReserveCount', () => {
    it('returns 0 for empty reserve', () => {
      const state = makeState();
      expect(getReserveCount(state, 'player1')).toBe(0);
    });

    it('returns correct count for populated reserve', () => {
      const state = makeState({
        reserves: {
          player1: [makeChecker('player1', 0), makeChecker('player1', 1)],
          player2: [makeChecker('player2', 0)],
        },
      });
      expect(getReserveCount(state, 'player1')).toBe(2);
      expect(getReserveCount(state, 'player2')).toBe(1);
    });
  });

  describe('getLockedCount', () => {
    it('returns 0 for empty locked', () => {
      const state = makeState();
      expect(getLockedCount(state, 'player1')).toBe(0);
    });

    it('returns correct count for populated locked', () => {
      const state = makeState({
        locked: {
          player1: [
            makeChecker('player1', 0, { zone: 'locked' }, true),
            makeChecker('player1', 1, { zone: 'locked' }, true),
            makeChecker('player1', 2, { zone: 'locked' }, true),
          ],
          player2: [],
        },
      });
      expect(getLockedCount(state, 'player1')).toBe(3);
      expect(getLockedCount(state, 'player2')).toBe(0);
    });
  });

  describe('getBoardCheckers', () => {
    it('returns empty array when no checkers on board', () => {
      const state = makeState();
      expect(getBoardCheckers(state, 'player1')).toEqual([]);
    });

    it('returns only the specified player checkers', () => {
      let state = makeState();
      state = placeCheckers(state, 3, 'player1', 2);
      state = placeCheckers(state, 10, 'player2', 3);
      state = placeCheckers(state, 15, 'player1', 1);

      const p1 = getBoardCheckers(state, 'player1');
      expect(p1).toHaveLength(3);
      expect(p1.every((c) => c.owner === 'player1')).toBe(true);

      const p2 = getBoardCheckers(state, 'player2');
      expect(p2).toHaveLength(3);
      expect(p2.every((c) => c.owner === 'player2')).toBe(true);
    });
  });

  describe('getHighestOccupiedSiegePoint', () => {
    it('returns null when no friendly checker in siege zone', () => {
      const state = makeState();
      expect(getHighestOccupiedSiegePoint(state, 'player1')).toBeNull();
    });

    it('P1: returns highest perspective point with unlocked checker', () => {
      // P1 siege zone: canonical 19-24 (= perspective 19-24)
      let state = makeState();
      state = placeCheckers(state, 20, 'player1', 1); // perspective 20
      state = placeCheckers(state, 22, 'player1', 1); // perspective 22

      expect(getHighestOccupiedSiegePoint(state, 'player1')).toBe(22);
    });

    it('P1: ignores locked checkers', () => {
      let state = makeState();
      // Place an unlocked checker at canonical 19 (perspective 19 for P1)
      state = placeCheckers(state, 19, 'player1', 1);
      // Place a locked checker at canonical 22 (perspective 22 for P1)
      const board = state.board.map((pt) => ({ ...pt, checkers: [...pt.checkers] }));
      board[21]!.checkers.push(
        makeChecker('player1', 99, { zone: 'board', point: 22 }, true),
      );
      state = { ...state, board };

      // Should return 19, not 22, because 22's checker is locked
      expect(getHighestOccupiedSiegePoint(state, 'player1')).toBe(19);
    });

    it('P2: canonical 1-6 is siege zone (perspective 19-24)', () => {
      let state = makeState();
      // P2 siege zone: canonical 1-6 (perspective = 25 - canonical)
      // canonical 3 = perspective 22, canonical 1 = perspective 24
      state = placeCheckers(state, 3, 'player2', 1); // perspective 22
      state = placeCheckers(state, 5, 'player2', 1); // perspective 20

      expect(getHighestOccupiedSiegePoint(state, 'player2')).toBe(22);
    });

    it('P2: canonical 1 = perspective 24 is the highest possible', () => {
      let state = makeState();
      state = placeCheckers(state, 1, 'player2', 1); // perspective 24
      state = placeCheckers(state, 6, 'player2', 1); // perspective 19

      expect(getHighestOccupiedSiegePoint(state, 'player2')).toBe(24);
    });

    it('ignores opponent checkers in the siege zone', () => {
      let state = makeState();
      // Put player2 checkers in player1's siege zone
      state = placeCheckers(state, 20, 'player2', 2);
      expect(getHighestOccupiedSiegePoint(state, 'player1')).toBeNull();
    });
  });
});
