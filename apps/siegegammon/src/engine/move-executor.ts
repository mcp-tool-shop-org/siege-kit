import type {
  GameState,
  Move,
  PointState,
  CheckerState,
} from '@mcp-tool-shop/siege-types';
import { toCanonical, toPerspective, opponent, getPoint } from './board-utils.js';
import { useDie } from './dice.js';

/**
 * Deep-clones a GameState using spread operators and map (no JSON.parse/stringify).
 * Produces a structurally identical but referentially distinct copy.
 */
export function cloneState(state: GameState): GameState {
  return {
    board: state.board.map((point): PointState => ({
      index: point.index,
      checkers: point.checkers.map((c): CheckerState => ({
        id: c.id,
        owner: c.owner,
        position: { ...c.position },
        isLocked: c.isLocked,
      })),
    })),
    reserves: {
      player1: state.reserves.player1.map((c): CheckerState => ({
        id: c.id,
        owner: c.owner,
        position: { ...c.position },
        isLocked: c.isLocked,
      })),
      player2: state.reserves.player2.map((c): CheckerState => ({
        id: c.id,
        owner: c.owner,
        position: { ...c.position },
        isLocked: c.isLocked,
      })),
    },
    locked: {
      player1: state.locked.player1.map((c): CheckerState => ({
        id: c.id,
        owner: c.owner,
        position: { ...c.position },
        isLocked: c.isLocked,
      })),
      player2: state.locked.player2.map((c): CheckerState => ({
        id: c.id,
        owner: c.owner,
        position: { ...c.position },
        isLocked: c.isLocked,
      })),
    },
    currentPlayer: state.currentPlayer,
    dice: state.dice
      ? {
          values: [...state.dice.values] as [number, number],
          isDoubles: state.dice.isDoubles,
          movesAvailable: state.dice.movesAvailable,
          movesUsed: state.dice.movesUsed,
          usedValues: [...state.dice.usedValues],
        }
      : null,
    doublingCube: { ...state.doublingCube },
    turnPhase: state.turnPhase,
    gamePhase: state.gamePhase,
    winner: state.winner,
    winType: state.winType,
  };
}

/**
 * Execute a validated move to produce a new GameState.
 * IMMUTABLE: never mutates the input state.
 */
export function executeMove(state: GameState, move: Move): GameState {
  const next = cloneState(state);
  const player = next.currentPlayer;
  const opp = opponent(player);

  if (move.type === 'deploy') {
    executeDeploy(next, move, player, opp);
  } else {
    executeAdvance(next, move, player, opp);
  }

  // Consume the die value used for this move
  next.dice = useDie(next.dice!, move.dieValue);

  return next;
}

/**
 * Deploy a checker from reserve to the board.
 */
function executeDeploy(
  state: GameState,
  move: Move,
  player: typeof state.currentPlayer,
  opp: typeof state.currentPlayer,
): void {
  // Find and remove checker from reserves
  const reserveIdx = state.reserves[player].findIndex(c => c.id === move.checkerId);
  const checker = state.reserves[player][reserveIdx];
  state.reserves[player].splice(reserveIdx, 1);

  // Deploy target: die value is the perspective point for deploy
  const canonicalTarget = toCanonical(move.dieValue, player);
  const targetPoint = getPoint(state, canonicalTarget);

  // Handle hit
  if (move.hits) {
    handleHit(state, targetPoint, move.hits, opp);
  }

  // Place checker on the target point
  if (!checker) throw new Error(`Checker ${move.checkerId} not found in reserves`);
  checker.position = { zone: 'board', point: canonicalTarget };
  targetPoint.checkers.push(checker);
}

/**
 * Advance a checker already on the board.
 */
function executeAdvance(
  state: GameState,
  move: Move,
  player: typeof state.currentPlayer,
  opp: typeof state.currentPlayer,
): void {
  // Find checker on the board and remove from source point
  let checker: CheckerState | undefined;
  for (const point of state.board) {
    const idx = point.checkers.findIndex(c => c.id === move.checkerId);
    if (idx !== -1) {
      checker = point.checkers[idx];
      point.checkers.splice(idx, 1);
      break;
    }
  }

  // Compute where this checker is in perspective coordinates
  const sourceCanonical = (move.from as { zone: 'board'; point: number }).point;
  const sourcePerspective = toPerspective(sourceCanonical, player);
  const perspectiveTarget = sourcePerspective + move.dieValue;

  // Check if this move results in a lock (reaching or overshooting siege zone)
  // Siege zone in perspective is always points 19-24
  if (perspectiveTarget >= 19) {
    // Lock the checker
    checker!.isLocked = true;
    checker!.position = { zone: 'locked' };
    state.locked[player].push(checker!);
  } else {
    // Normal advance to a new board point
    const canonicalTarget = toCanonical(perspectiveTarget, player);
    const targetPoint = getPoint(state, canonicalTarget);

    // Handle hit
    if (move.hits) {
      handleHit(state, targetPoint, move.hits, opp);
    }

    // Place checker on target point
    checker!.position = { zone: 'board', point: canonicalTarget };
    targetPoint.checkers.push(checker!);
  }
}

/**
 * Handle hitting an opponent's blot: remove from board point, send to opponent's reserves.
 */
function handleHit(
  state: GameState,
  targetPoint: PointState,
  hitCheckerId: string,
  opponentPlayer: typeof state.currentPlayer,
): void {
  const hitIdx = targetPoint.checkers.findIndex(c => c.id === hitCheckerId);
  const hitChecker = targetPoint.checkers[hitIdx];
  targetPoint.checkers.splice(hitIdx, 1);

  if (!hitChecker) throw new Error(`Hit checker ${hitCheckerId} not found at target point`);
  hitChecker.position = { zone: 'reserve' };
  hitChecker.isLocked = false;
  state.reserves[opponentPlayer].push(hitChecker);
}
