import type { GameState, Move } from '@mcp-tool-shop/siege-types';
import { createInitialGameState } from './game-state.js';
import { executeMove } from './move-executor.js';
import { allDiceUsed } from './dice.js';
import { startGame, rollPhase, rollPhaseDeterministic, endTurn } from './turn-manager.js';
import {
  canOfferDouble,
  offerDouble,
  acceptDouble,
  declineDouble,
} from './doubling-cube.js';

export type GameAction =
  | { type: 'reset' }
  | { type: 'start-game'; openingRoll: [number, number] }
  | { type: 'roll-dice' }
  | { type: 'roll-dice-deterministic'; values: [number, number] }
  | { type: 'execute-move'; move: Move }
  | { type: 'end-turn' }
  | { type: 'offer-double' }
  | { type: 'accept-double' }
  | { type: 'decline-double' };

/**
 * Pure game reducer. Delegates each action to the appropriate engine function.
 * Returns the state unchanged (no-op) for invalid actions rather than throwing.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'reset':
      return createInitialGameState();

    case 'start-game': {
      if (state.gamePhase !== 'setup') return state;
      return startGame(state, action.openingRoll);
    }

    case 'roll-dice': {
      if (state.turnPhase !== 'pre-roll' || state.gamePhase !== 'playing') return state;
      return rollPhase(state);
    }

    case 'roll-dice-deterministic': {
      if (state.turnPhase !== 'pre-roll' || state.gamePhase !== 'playing') return state;
      return rollPhaseDeterministic(state, action.values);
    }

    case 'execute-move': {
      if (state.turnPhase !== 'moving' || !state.dice) return state;
      const result = executeMove(state, action.move);
      if (allDiceUsed(result.dice!)) {
        return endTurn(result);
      }
      return result;
    }

    case 'end-turn':
      return endTurn(state);

    case 'offer-double': {
      if (!canOfferDouble(state, state.currentPlayer)) return state;
      return offerDouble(state);
    }

    case 'accept-double': {
      if (!state.doublingCube.isOffered) return state;
      return acceptDouble(state);
    }

    case 'decline-double': {
      if (!state.doublingCube.isOffered) return state;
      return declineDouble(state);
    }

    default:
      return state;
  }
}
