import { useState, useCallback } from 'react';
import type { GameState } from '@mcp-tool-shop/siege-types';
import { createInitialGameState } from '../engine/game-state.js';

export type GameAction =
  | { type: 'reset' }
  // TODO: add deploy, advance, roll, double, etc.
  | { type: '__placeholder' };

/**
 * Stub game state hook.
 * TODO: replace dispatch with a proper reducer once game logic is implemented.
 */
export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState);

  const dispatch = useCallback((action: GameAction) => {
    switch (action.type) {
      case 'reset':
        setGameState(createInitialGameState());
        break;
      default:
        // TODO: handle game actions
        break;
    }
  }, []);

  return { gameState, dispatch } as const;
}
