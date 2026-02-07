import type { GameState } from '@mcp-tool-shop/siege-types';
import type { GameAction } from '../../hooks/useGameState.js';

interface GameControlsProps {
  gameState: GameState;
  dispatch: (action: GameAction) => void;
}

const BTN_STYLE: React.CSSProperties = {
  background: '#2a2a2a',
  color: '#c5a028',
  border: '1px solid #444',
  borderRadius: 6,
  padding: '8px 18px',
  fontSize: 14,
  fontFamily: 'sans-serif',
  cursor: 'pointer',
  transition: 'background 0.15s',
};

const BAR_STYLE: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  justifyContent: 'center',
  padding: '8px 0',
};

function generateOpeningRoll(): [number, number] {
  let a: number;
  let b: number;
  do {
    a = Math.floor(Math.random() * 6) + 1;
    b = Math.floor(Math.random() * 6) + 1;
  } while (a === b);
  return [a, b];
}

export function GameControls({ gameState, dispatch }: GameControlsProps) {
  const { gamePhase, turnPhase, doublingCube } = gameState;

  return (
    <div style={BAR_STYLE}>
      {/* Setup phase */}
      {gamePhase === 'setup' && (
        <button
          style={BTN_STYLE}
          onClick={() =>
            dispatch({ type: 'start-game', openingRoll: generateOpeningRoll() })
          }
        >
          Start Game
        </button>
      )}

      {/* Playing, pre-roll, no double offered */}
      {gamePhase === 'playing' &&
        turnPhase === 'pre-roll' &&
        !doublingCube.isOffered && (
          <>
            <button
              style={BTN_STYLE}
              onClick={() => dispatch({ type: 'roll-dice' })}
            >
              Roll Dice
            </button>
            <button
              style={BTN_STYLE}
              onClick={() => dispatch({ type: 'offer-double' })}
            >
              Double
            </button>
          </>
        )}

      {/* Doubling offered */}
      {doublingCube.isOffered && (
        <>
          <button
            style={BTN_STYLE}
            onClick={() => dispatch({ type: 'accept-double' })}
          >
            Accept
          </button>
          <button
            style={BTN_STYLE}
            onClick={() => dispatch({ type: 'decline-double' })}
          >
            Decline
          </button>
        </>
      )}

      {/* Moving phase — forfeit remaining */}
      {turnPhase === 'moving' && (
        <button
          style={BTN_STYLE}
          onClick={() => dispatch({ type: 'end-turn' })}
        >
          End Turn
        </button>
      )}

      {/* Game finished */}
      {gamePhase === 'finished' && (
        <button
          style={BTN_STYLE}
          onClick={() => dispatch({ type: 'reset' })}
        >
          New Game
        </button>
      )}
    </div>
  );
}
