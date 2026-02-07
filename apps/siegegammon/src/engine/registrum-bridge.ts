import type {
  State,
  Transition,
  Invariant,
  InvariantInput,
} from '@mcp-tool-shop/registrum';
import {
  StructuralRegistrar,
  INITIAL_INVARIANTS,
} from '@mcp-tool-shop/registrum';
import type { GameState } from '@mcp-tool-shop/siege-types';
import {
  getReserveCount,
  getLockedCount,
  getBoardCheckers,
} from './board-utils.js';

// ── Structure extraction ────────────────────────────────────────────

/**
 * Extracts the structural fields from a GameState that Registrum will
 * reason about.  Everything here is inspectable; the full GameState is
 * stashed in `data` (opaque to the registrar).
 */
export function toRegistrumStructure(
  gameState: GameState,
  moveIndex: number,
): Record<string, unknown> {
  const player1Board = getBoardCheckers(gameState, 'player1').length;
  const player2Board = getBoardCheckers(gameState, 'player2').length;
  const player1Reserve = getReserveCount(gameState, 'player1');
  const player2Reserve = getReserveCount(gameState, 'player2');
  const player1Locked = getLockedCount(gameState, 'player1');
  const player2Locked = getLockedCount(gameState, 'player2');

  const player1Checkers = player1Reserve + player1Board + player1Locked;
  const player2Checkers = player2Reserve + player2Board + player2Locked;

  return {
    totalCheckers: player1Checkers + player2Checkers,
    player1Checkers,
    player2Checkers,
    player1Locked,
    player2Locked,
    currentPlayer: gameState.currentPlayer,
    turnPhase: gameState.turnPhase,
    gamePhase: gameState.gamePhase,
    cubeValue: gameState.doublingCube.value,
    moveIndex,
  };
}

// ── Registrum State / Transition factories ───────────────────────────

/**
 * Converts a GameState into a Registrum State.
 *
 * - `id`:        the caller-supplied stateId
 * - `structure`: inspectable structural fields (what the registrar sees)
 * - `data`:      the full GameState (opaque to the registrar)
 */
export function toRegistrumState(
  gameState: GameState,
  stateId: string,
  moveIndex: number,
): State {
  return {
    id: stateId,
    structure: toRegistrumStructure(gameState, moveIndex),
    data: gameState,
  };
}

/**
 * Creates a Registrum Transition from a previous state to a new state.
 *
 * When `prevState` is supplied its locked counts and gamePhase are
 * forwarded in `metadata` so that transition-scoped invariants can
 * compare before/after without Registrum needing to store full states.
 */
export function toRegistrumTransition(
  prevId: string | null,
  gameState: GameState,
  newId: string,
  moveIndex: number,
  prevState?: GameState,
): Transition {
  const to = toRegistrumState(gameState, newId, moveIndex);

  const metadata: Record<string, unknown> = {};

  if (prevState) {
    metadata.prevPlayer1Locked = getLockedCount(prevState, 'player1');
    metadata.prevPlayer2Locked = getLockedCount(prevState, 'player2');
    metadata.prevGamePhase = prevState.gamePhase;
  }

  return {
    from: prevId,
    to,
    metadata,
  };
}

// ── Game-specific invariants ────────────────────────────────────────

const VALID_PHASE_TRANSITIONS: ReadonlySet<string> = new Set([
  'setup->setup',
  'setup->playing',
  'playing->playing',
  'playing->finished',
  'finished->finished',
]);

/**
 * Returns the four game-specific invariants that Registrum will enforce
 * on every state / transition in a SiegeGammon game.
 */
export function createGameInvariants(): Invariant[] {
  const checkerConservation: Invariant = {
    id: 'game.checkers.conservation',
    scope: 'state',
    appliesTo: ['totalCheckers'],
    failureMode: 'halt',
    description:
      'Total checker count must always equal 30 (15 per player).',
    predicate: (input: InvariantInput): boolean => {
      if (input.kind !== 'state') return true;
      return input.state.structure.totalCheckers === 30;
    },
  };

  const perPlayerCheckers: Invariant = {
    id: 'game.checkers.per_player',
    scope: 'state',
    appliesTo: ['player1Checkers', 'player2Checkers'],
    failureMode: 'halt',
    description:
      'Each player must always have exactly 15 checkers.',
    predicate: (input: InvariantInput): boolean => {
      if (input.kind !== 'state') return true;
      const s = input.state.structure;
      return s.player1Checkers === 15 && s.player2Checkers === 15;
    },
  };

  const lockedMonotonic: Invariant = {
    id: 'game.locked.monotonic',
    scope: 'transition',
    appliesTo: ['player1Locked', 'player2Locked'],
    failureMode: 'reject',
    description:
      'Locked counts must never decrease across a transition.',
    predicate: (input: InvariantInput): boolean => {
      if (input.kind !== 'transition') return true;
      const transition = input.transition;

      // Root transition — nothing to compare against
      if (transition.from === null) return true;

      const meta = transition.metadata as
        | Record<string, unknown>
        | undefined;
      if (!meta) return true;

      const prevP1 = meta.prevPlayer1Locked as number;
      const prevP2 = meta.prevPlayer2Locked as number;
      const curP1 = transition.to.structure.player1Locked as number;
      const curP2 = transition.to.structure.player2Locked as number;

      return curP1 >= prevP1 && curP2 >= prevP2;
    },
  };

  const phaseValid: Invariant = {
    id: 'game.phase.valid',
    scope: 'transition',
    appliesTo: ['gamePhase'],
    failureMode: 'reject',
    description:
      'Game phase must follow setup -> playing -> finished (no going back).',
    predicate: (input: InvariantInput): boolean => {
      if (input.kind !== 'transition') return true;
      const transition = input.transition;

      // Root transition — nothing to compare against
      if (transition.from === null) return true;

      const meta = transition.metadata as
        | Record<string, unknown>
        | undefined;
      if (!meta) return true;

      const prevPhase = meta.prevGamePhase as string;
      const curPhase = transition.to.structure.gamePhase as string;

      return VALID_PHASE_TRANSITIONS.has(`${prevPhase}->${curPhase}`);
    },
  };

  return [checkerConservation, perPlayerCheckers, lockedMonotonic, phaseValid];
}

// ── Registrar factory ───────────────────────────────────────────────

/**
 * Creates a StructuralRegistrar in legacy mode with both the built-in
 * INITIAL_INVARIANTS and the game-specific invariants.
 */
export function createRegistrar(): StructuralRegistrar {
  return new StructuralRegistrar({
    mode: 'legacy',
    invariants: [...INITIAL_INVARIANTS, ...createGameInvariants()],
  });
}
