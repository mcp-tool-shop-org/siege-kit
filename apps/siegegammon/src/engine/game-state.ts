import type {
  GameState,
  PlayerId,
  CheckerState,
  PointState,
} from '@mcp-tool-shop/siege-types';

function makeChecker(owner: PlayerId, index: number): CheckerState {
  return {
    id: `${owner}-${index}`,
    owner,
    position: { zone: 'reserve' },
    isLocked: false,
  };
}

function makeEmptyBoard(): PointState[] {
  return Array.from({ length: 24 }, (_, i) => ({
    index: i + 1,
    checkers: [],
  }));
}

/**
 * Creates a fresh game state with all 15 checkers per player in reserve.
 * TODO: implement full game logic (deploy, advance, hit, lock, bear-off)
 */
export function createInitialGameState(): GameState {
  const p1Checkers = Array.from({ length: 15 }, (_, i) => makeChecker('player1', i));
  const p2Checkers = Array.from({ length: 15 }, (_, i) => makeChecker('player2', i));

  return {
    board: makeEmptyBoard(),
    reserves: {
      player1: p1Checkers,
      player2: p2Checkers,
    },
    locked: {
      player1: [],
      player2: [],
    },
    currentPlayer: 'player1',
    dice: null,
    doublingCube: {
      value: 1,
      owner: 'center',
      isOffered: false,
    },
    turnPhase: 'pre-roll',
    gamePhase: 'setup',
    winner: null,
    winType: null,
  };
}
